import { pickVersionAsOf, todaySeoul } from '../../../src/domain/legalVersion';
import type { LegalSource, VerificationStatus } from '../../../src/types';
import type { LawVersionRef, LegalArticle, LegalArticlesRequest, LegalArticlesResponse, LegalSearchCandidate, LegalSearchRequest, LegalSearchResponse, LegalVersionsResponse } from '../../../src/types/legal';
import type { LawId } from '../../../src/types/ids';
import { TtlCache } from '../cache';
import type { ServerConfig } from '../config';
import { LegalError } from '../errors';
import type { LawSourceAdapter, SearchHit, VersionBody } from './source';

const UNVERIFIED_NOTE = '실제 법제처 API 응답으로 검증되지 않은 연동입니다';
export const articleLabel = (no: number, branch: number | null) => `제${no}조${branch ? `의${branch}` : ''}`;

export class LegalService {
  private readonly searchCache: TtlCache<SearchHit>;
  private readonly versionCache: TtlCache<LawVersionRef[]>;
  private readonly bodyCache: TtlCache<VersionBody>;

  constructor(
    private readonly adapter: LawSourceAdapter,
    private readonly ttl: ServerConfig['cacheTtl'] = { bodyMs: 24 * 3600_000, searchMs: 3600_000 },
    private readonly now: () => Date = () => new Date(),
  ) {
    const clock = () => this.now().getTime();
    this.searchCache = new TtlCache(clock);
    this.versionCache = new TtlCache(clock);
    this.bodyCache = new TtlCache(clock);
  }

  get adapterInfo() { return { name: this.adapter.name, contractStatus: this.adapter.contractStatus }; }

  /** 계약이 live-verified가 아니면 어떤 결과도 'verified'로 표시하지 않는다 */
  private cap(v: VerificationStatus): VerificationStatus { return this.adapter.contractStatus === 'live-verified' ? v : v === 'verified' ? 'needs-check' : v; }

  async search(req: LegalSearchRequest): Promise<LegalSearchResponse> {
    const asOf = req.asOf ?? todaySeoul(this.now());
    const key = `${req.query}|${[...(req.sourceTypes ?? [])].sort().join(',')}`;
    let hit = this.searchCache.get(key);
    if (!hit) { hit = await this.adapter.searchVersions(req.query, req.sourceTypes); this.searchCache.set(key, hit, this.ttl.searchMs); }
    const byLaw = new Map<LawId, LawVersionRef[]>();
    for (const v of hit.versions) byLaw.set(v.lawId, [...(byLaw.get(v.lawId) ?? []), v]);
    const candidates: LegalSearchCandidate[] = [];
    for (const [lawId, versions] of byLaw) {
      const rep = [...versions].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      const pick = pickVersionAsOf(versions, asOf);
      const base = { lawId, lawName: rep.lawName, sourceType: rep.sourceType };
      if (pick.status === 'ok') candidates.push({ ...base, inForce: pick.version, upcoming: pick.pending, verification: this.cap('verified'), note: this.adapter.contractStatus === 'live-verified' ? null : UNVERIFIED_NOTE });
      else if (pick.status === 'none') candidates.push({ ...base, inForce: null, upcoming: [...versions].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)), verification: 'needs-check', note: '기준일에 시행 중인 버전이 없습니다 (시행 예정이거나 기준일 이전 자료 없음)' });
      else candidates.push({ ...base, inForce: null, upcoming: [], verification: 'needs-check', note: '같은 시행일에 서로 다른 일련번호가 있어 버전을 하나로 확정할 수 없습니다 — 확인 필요' });
    }
    return { asOf, candidates, warnings: hit.warnings, retrievedAt: this.now().toISOString() };
  }

  async versions(lawId: LawId): Promise<LegalVersionsResponse> {
    return { lawId, versions: [...(await this.loadVersions(lawId))].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)) };
  }

  async articles(req: LegalArticlesRequest): Promise<LegalArticlesResponse> {
    const asOf = req.asOf ?? todaySeoul(this.now());
    const pick = pickVersionAsOf(await this.loadVersions(req.lawId), asOf);
    if (pick.status === 'none') throw new LegalError('LAW_NOT_FOUND', `${asOf} 기준으로 시행 중인 버전을 찾지 못했습니다`);
    if (pick.status === 'ambiguous') throw new LegalError('LAW_VERSION_AMBIGUOUS', `${asOf} 기준 시행 버전을 하나로 확정할 수 없습니다 (같은 시행일의 일련번호 ${pick.candidates.map((c) => c.mst).join(', ')})`);
    const version = pick.version;
    const bodyKey = `${version.lawId}|${version.mst}`; // 버전(mst)이 키에 포함 → 개정되면 새 키
    let body = this.bodyCache.get(bodyKey);
    if (!body) { body = await this.adapter.getBody(version); this.bodyCache.set(bodyKey, body, this.ttl.bodyMs); }

    const articles: LegalArticle[] = [];
    const missing: LegalArticlesResponse['missing'] = [];
    for (const want of req.articles) {
      const found = body.articles.find((a) => a.ref.articleNo === want.articleNo && (a.ref.branchNo ?? null) === (want.branchNo ?? null));
      if (found) articles.push({ version, ref: found.ref, title: found.title, text: found.text });
      else missing.push(want);
    }
    if (articles.length === 0) throw new LegalError('LAW_NOT_FOUND', '요청한 조문을 해당 버전에서 찾지 못했습니다');

    const url = this.adapter.officialUrl?.(version) ?? null;
    const sources: LegalSource[] = articles.map((a) => ({
      sourceId: `${version.lawId}:${version.mst}:${a.ref.articleNo}${a.ref.branchNo ? `-${a.ref.branchNo}` : ''}`,
      sourceType: version.sourceType, lawName: version.lawName, article: articleLabel(a.ref.articleNo, a.ref.branchNo),
      effectiveDate: version.effectiveDate, jurisdiction: '전국', officialUrl: url, retrievedAt: this.now().toISOString(),
    }));
    const warnings: string[] = [];
    if (this.adapter.contractStatus !== 'live-verified') warnings.push(UNVERIFIED_NOTE);
    if (missing.length) warnings.push(`찾지 못한 조문: ${missing.map((m) => articleLabel(m.articleNo, m.branchNo)).join(', ')}`);
    if (!url) warnings.push('공식 URL을 확인하지 못했습니다');
    const complete = missing.length === 0 && url !== null && articles.every((a) => a.text.length > 0);
    return { asOf, version, articles, missing, sources, warnings, verification: this.cap(complete ? 'verified' : 'needs-check'), retrievedAt: this.now().toISOString() };
  }

  private async loadVersions(lawId: LawId): Promise<LawVersionRef[]> {
    let v = this.versionCache.get(lawId);
    if (!v) { v = await this.adapter.listVersions(lawId); this.versionCache.set(lawId, v, this.ttl.searchMs); }
    return v;
  }
}
