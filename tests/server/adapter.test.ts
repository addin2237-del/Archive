import { describe, expect, it } from 'vitest';
import { LegalError } from '../../server/src/errors';
import { LawGoKrAdapter, UnconfiguredAdapter } from '../../server/src/legal/lawgokr/adapter';
import { asIsoDate, asLawId, asLawMst } from '../../src/types/ids';
import type { LawVersionRef } from '../../src/types/legal';
import { fixtureText } from './fixtures';
import { makeAdapter, TEST_OC } from './helpers';

const v2: LawVersionRef = { lawId: asLawId('SYN-L1'), mst: asLawMst('SYN-M2'), lawName: '건축법', sourceType: '법률', effectiveDate: asIsoDate('2022-06-30'), promulgationDate: null, promulgationNo: null };
const fail = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as LegalError; } throw new Error('실패해야 하는 호출이 성공했습니다'); };

describe('법제처 어댑터 (가짜 fetch, 합성 응답)', () => {
  it('요청 URL에 OC·type·target을 붙이고 검색 결과를 정규화한다', async () => {
    const { adapter, calls } = makeAdapter();
    const hit = await adapter.searchVersions('건축법', undefined);
    expect(hit.versions.length).toBeGreaterThan(0);
    const u = calls[0].url;
    expect(u.pathname.endsWith('/lawSearch.do')).toBe(true);
    expect(u.searchParams.get('OC')).toBe(TEST_OC);
    expect(u.searchParams.get('target')).toBe('eflaw');
    expect(u.searchParams.get('type')).toBe('JSON');
  });
  it('sourceTypes로 걸러낸다', async () => {
    const { adapter } = makeAdapter();
    const hit = await adapter.searchVersions('건축법', ['시행령']);
    expect(hit.versions.every((v) => v.sourceType === '시행령')).toBe(true);
    expect(hit.versions.length).toBe(1);
  });
  it('본문 조회는 법령일련번호(MST)로 요청한다 — 법령ID가 아니라', async () => {
    const { adapter, calls } = makeAdapter();
    await adapter.getBody(v2);
    expect(calls[0].url.searchParams.get('MST')).toBe('SYN-M2');
    expect(calls[0].url.searchParams.has('ID')).toBe(false);
  });
  it('listVersions는 LID 필터가 무시돼 다른 법령이 섞여 와도 lawId로 다시 거른다', async () => {
    const { adapter } = makeAdapter();
    const vs = await adapter.listVersions(asLawId('SYN-L1'));
    expect(vs.map((v) => v.mst)).toEqual(['SYN-M1', 'SYN-M2', 'SYN-M3']);
    expect(vs.every((v) => v.lawId === 'SYN-L1')).toBe(true);
  });
  it('listVersions: 해당 법령이 없으면 LAW_NOT_FOUND', async () => {
    expect((await fail(makeAdapter().adapter.listVersions(asLawId('NOPE')))).code).toBe('LAW_NOT_FOUND');
  });
  it('계약이 실제 응답으로 검증되기 전에는 synthetic 상태이며 공식 URL을 만들지 않는다', () => {
    const { adapter } = makeAdapter();
    expect(adapter.contractStatus).toBe('synthetic');
    expect(adapter.officialUrl()).toBeNull();
  });
});

describe('오류 처리', () => {
  const route = (status: number, text = '') => () => ({ status, text });
  it.each([[403, 'LAW_UPSTREAM_FORBIDDEN', 1], [401, 'LAW_OC_INVALID', 1], [404, 'LAW_UPSTREAM_BAD_RESPONSE', 1]] as const)('HTTP %i → %s (재시도 안 함)', async (status, code, calls) => {
    const { adapter, calls: c } = makeAdapter(route(status));
    expect((await fail(adapter.searchVersions('x', undefined))).code).toBe(code);
    expect(c).toHaveLength(calls);
  });
  it('HTTP 429/5xx는 재시도(백오프) 후 실패', async () => {
    for (const [status, code] of [[429, 'LAW_RATE_LIMITED'], [503, 'LAW_UPSTREAM_UNAVAILABLE']] as const) {
      const { adapter, calls, sleeps } = makeAdapter(route(status));
      expect((await fail(adapter.searchVersions('x', undefined))).code).toBe(code);
      expect(calls).toHaveLength(3); // 최초 + 재시도 2회
      expect(sleeps).toEqual([250, 500]);
    }
  });
  it('재시도 중 성공하면 결과를 돌려준다', async () => {
    let n = 0;
    const { adapter, calls } = makeAdapter(() => (++n < 3 ? { status: 503, text: '' } : { text: fixtureText('search-eflaw-single') }));
    expect((await adapter.searchVersions('x', undefined)).versions).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });
  it('HTTP 200이어도 인증 실패 본문이면 LAW_OC_INVALID', async () => {
    const { adapter } = makeAdapter(() => ({ text: fixtureText('error-oc-failed') }));
    expect((await fail(adapter.searchVersions('x', undefined))).code).toBe('LAW_OC_INVALID');
  });
  it('HTTP 200이어도 JSON이 아니면 LAW_UPSTREAM_BAD_RESPONSE (성공으로 보지 않음)', async () => {
    const { adapter } = makeAdapter(() => ({ text: fixtureText('error-html-page') }));
    expect((await fail(adapter.searchVersions('x', undefined))).code).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
  it('HTTP 200이어도 알 수 없는 JSON 구조면 BAD_RESPONSE', async () => {
    const { adapter } = makeAdapter(() => ({ text: JSON.stringify({ result: 'fail' }) }));
    expect((await fail(adapter.searchVersions('x', undefined))).code).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
  it('시간 초과는 LAW_UPSTREAM_TIMEOUT (재시도 후)', async () => {
    const hang = () => async (): Promise<{ status: number; text(): Promise<string> }> => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); };
    const { adapter, calls } = makeAdapter(hang);
    expect((await fail(adapter.searchVersions('x', undefined))).code).toBe('LAW_UPSTREAM_TIMEOUT');
    expect(calls).toHaveLength(3);
  });
  it('실제 타임아웃: 응답이 없으면 AbortController로 끊는다', async () => {
    const hangUntilAbort = (_u: string, init: { signal: AbortSignal }) => new Promise<never>((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const a = new LawGoKrAdapter({ lawOc: TEST_OC, lawBaseUrl: 'https://upstream.test/DRF', upstreamTimeoutMs: 20, upstreamMaxRetries: 0 }, hangUntilAbort);
    expect((await fail(a.searchVersions('x', undefined))).code).toBe('LAW_UPSTREAM_TIMEOUT');
  });
  it('네트워크 오류 메시지에 OC·URL이 노출되지 않는다', async () => {
    const { adapter } = makeAdapter(() => async () => { throw new Error(`connect failed https://upstream.test/DRF/lawSearch.do?OC=${TEST_OC}&x=1 ${TEST_OC}`); }, { upstreamMaxRetries: 0 });
    const e = await fail(adapter.searchVersions('x', undefined));
    expect(e.code).toBe('LAW_UPSTREAM_UNAVAILABLE');
    expect(e.message).not.toContain(TEST_OC);
    expect(JSON.stringify(e.toApiError())).not.toContain(TEST_OC);
  });
  it('OC가 없으면 호출하지 않고 LAW_OC_INVALID', async () => {
    const { adapter, calls } = makeAdapter(undefined, { lawOc: null });
    expect((await fail(adapter.searchVersions('x', undefined))).code).toBe('LAW_OC_INVALID');
    expect(calls).toHaveLength(0);
  });
  it('UnconfiguredAdapter는 모든 호출이 명확한 오류 (가짜 데이터 없음)', async () => {
    const a = new UnconfiguredAdapter();
    expect(a.contractStatus).toBe('unconfigured');
    expect((await fail(a.searchVersions())).code).toBe('LAW_OC_INVALID');
    expect((await fail(a.listVersions())).code).toBe('LAW_OC_INVALID');
    expect((await fail(a.getBody())).code).toBe('LAW_OC_INVALID');
  });
});
