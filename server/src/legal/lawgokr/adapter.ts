import type { SourceType } from '../../../../src/types';
import type { LawId } from '../../../../src/types/ids';
import type { LawVersionRef } from '../../../../src/types/legal';
import type { ServerConfig } from '../../config';
import { LegalError, redact } from '../../errors';
import type { ContractStatus, LawSourceAdapter, SearchHit, VersionBody } from '../source';
import { parseBody, parseSearch } from './parse';
import { LIVE_CONTRACT_VERIFIED } from './status';

type FetchLike = (url: string, init: { signal: AbortSignal }) => Promise<{ status: number; text(): Promise<string> }>;
const OC_FAILURE_MARKER = '사용자 정보 검증에 실패'; // 가정: 인증·IP 등록 오류 본문. 실제 문구는 probe로 확인

/** 법제처 DRF 직접 호출 어댑터 (정본 경로). 응답 구조는 아직 실제로 검증되지 않았다 → contractStatus 'synthetic'. */
export class LawGoKrAdapter implements LawSourceAdapter {
  readonly name = 'law.go.kr';
  readonly contractStatus: ContractStatus = LIVE_CONTRACT_VERIFIED ? 'live-verified' : 'synthetic';

  constructor(
    private readonly cfg: Pick<ServerConfig, 'lawOc' | 'lawBaseUrl' | 'upstreamTimeoutMs' | 'upstreamMaxRetries'>,
    private readonly fetchImpl: FetchLike = (url, init) => fetch(url, init),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async searchVersions(query: string, sourceTypes: SourceType[] | undefined): Promise<SearchHit> {
    const hit = parseSearch(await this.request('lawSearch.do', { target: 'eflaw', query, display: '100' }));
    return sourceTypes?.length ? { ...hit, versions: hit.versions.filter((v) => sourceTypes.includes(v.sourceType)) } : hit;
  }

  async listVersions(lawId: LawId): Promise<LawVersionRef[]> {
    // 'LID'(법령ID 필터) 파라미터는 가정. 무시되더라도 아래에서 lawId로 다시 걸러 다른 법령이 섞이지 않게 한다.
    const hit = parseSearch(await this.request('lawSearch.do', { target: 'eflaw', LID: lawId, display: '100' }));
    const versions = hit.versions.filter((v) => v.lawId === lawId);
    if (versions.length === 0) throw new LegalError('LAW_NOT_FOUND', '해당 법령ID의 버전을 찾지 못했습니다');
    return versions;
  }

  async getBody(version: LawVersionRef): Promise<VersionBody> {
    return parseBody(await this.request('lawService.do', { target: 'eflaw', MST: version.mst }), version);
  }

  // 공식 URL 패턴은 확인되지 않았으므로 만들지 않는다. (확인 후 구현)
  officialUrl(): string | null { return null; }

  private async request(endpoint: string, params: Record<string, string>): Promise<unknown> {
    const oc = this.cfg.lawOc;
    if (!oc) throw new LegalError('LAW_OC_INVALID', 'LAW_OC 환경변수가 설정되지 않아 법제처를 호출할 수 없습니다');
    const url = `${this.cfg.lawBaseUrl}/${endpoint}?${new URLSearchParams({ OC: oc, type: 'JSON', ...params })}`;
    let last: LegalError | null = null;
    for (let attempt = 0; attempt <= this.cfg.upstreamMaxRetries; attempt++) {
      if (attempt > 0) await this.sleep(250 * 2 ** (attempt - 1));
      try {
        return await this.once(url, oc);
      } catch (e) {
        if (!(e instanceof LegalError)) throw e;
        last = e;
        if (!['LAW_UPSTREAM_TIMEOUT', 'LAW_UPSTREAM_UNAVAILABLE', 'LAW_RATE_LIMITED'].includes(e.code)) throw e; // 재시도 불가 오류
      }
    }
    throw last!;
  }

  private async once(url: string, oc: string): Promise<unknown> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.cfg.upstreamTimeoutMs);
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchImpl(url, { signal: ctl.signal });
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      throw new LegalError(aborted ? 'LAW_UPSTREAM_TIMEOUT' : 'LAW_UPSTREAM_UNAVAILABLE', aborted ? '법제처 응답 시간 초과' : redact(`법제처에 연결할 수 없습니다: ${e instanceof Error ? e.message : 'unknown'}`, [oc, url]));
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 403) throw new LegalError('LAW_UPSTREAM_FORBIDDEN', '법제처 접속이 거부되었습니다 (네트워크 허용 도메인 또는 서버 IP 등록 확인)');
    if (res.status === 401) throw new LegalError('LAW_OC_INVALID', '법제처 인증에 실패했습니다 (OC 확인)');
    if (res.status === 429) throw new LegalError('LAW_RATE_LIMITED', '법제처 호출 한도를 초과했습니다');
    if (res.status >= 500) throw new LegalError('LAW_UPSTREAM_UNAVAILABLE', `법제처 서버 오류 (HTTP ${res.status})`);
    if (res.status !== 200) throw new LegalError('LAW_UPSTREAM_BAD_RESPONSE', `예상하지 못한 HTTP 상태 ${res.status}`);
    const text = await res.text();
    // 법제처는 오류에도 HTTP 200을 줄 수 있으므로 본문을 반드시 확인한다
    if (text.includes(OC_FAILURE_MARKER)) throw new LegalError('LAW_OC_INVALID', '법제처 인증 실패 (OC 값 또는 등록된 서버 IP 확인)');
    try {
      return JSON.parse(text);
    } catch {
      throw new LegalError('LAW_UPSTREAM_BAD_RESPONSE', '법제처 응답이 JSON이 아닙니다 (오류 페이지일 수 있음)');
    }
  }
}

/** 인증값이 없는 상태의 어댑터. 모든 호출이 명확한 오류로 실패한다 (가짜 데이터로 대체하지 않는다). */
export class UnconfiguredAdapter implements LawSourceAdapter {
  readonly name = 'unconfigured';
  readonly contractStatus: ContractStatus = 'unconfigured';
  private fail(): never { throw new LegalError('LAW_OC_INVALID', 'LAW_OC 환경변수가 설정되지 않았습니다. 법령 원문 조회를 사용할 수 없습니다'); }
  async searchVersions(): Promise<SearchHit> { return this.fail(); }
  async listVersions(): Promise<LawVersionRef[]> { return this.fail(); }
  async getBody(): Promise<VersionBody> { return this.fail(); }
}
