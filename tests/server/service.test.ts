import { describe, expect, it } from 'vitest';
import { LegalError } from '../../server/src/errors';
import { LegalService } from '../../server/src/legal/service';
import type { ContractStatus, LawSourceAdapter } from '../../server/src/legal/source';
import { asArticleNo, asBranchNo, asIsoDate as d, asLawId } from '../../src/types/ids';
import { fixtureText } from './fixtures';
import { makeAdapter } from './helpers';

const L1 = asLawId('SYN-L1');
const fixedNow = () => new Date('2026-10-14T03:00:00Z');
const mk = () => { const m = makeAdapter(); return { ...m, service: new LegalService(m.adapter, undefined, fixedNow) }; };
const code = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e instanceof LegalError ? e.code : 'OTHER'; } return 'NO_ERROR'; };

describe('법령 검색: 기준일에 맞는 버전 선택 (합성 데이터)', () => {
  it('기준일 2023-01-01 → 시행 중 M2, 시행 예정 M3 분리', async () => {
    const { service } = mk();
    const r = await service.search({ query: '건축법', asOf: d('2023-01-01') });
    const law = r.candidates.find((c) => c.lawId === 'SYN-L1')!;
    expect(law.inForce?.mst).toBe('SYN-M2');
    expect(law.upcoming.map((v) => v.mst)).toEqual(['SYN-M3']);
  });
  it('기준일 생략 시 오늘(Asia/Seoul) 기준', async () => {
    const r = await mk().service.search({ query: '건축법' });
    expect(r.asOf).toBe('2026-10-14');
    expect(r.candidates.find((c) => c.lawId === 'SYN-L1')!.inForce?.mst).toBe('SYN-M2'); // M3는 2030 시행 예정
  });
  it('시행 중인 버전이 없으면 inForce null + 확인 필요', async () => {
    const r = await mk().service.search({ query: '건축법', asOf: d('2019-01-01') });
    const law = r.candidates.find((c) => c.lawId === 'SYN-L1')!;
    expect(law.inForce).toBeNull();
    expect(law.verification).toBe('needs-check');
    expect(law.upcoming.length).toBe(3);
  });
  it('3종(법률·시행령·시행규칙)이 각각 별도 법령ID 후보로 나온다', async () => {
    const r = await mk().service.search({ query: '건축법', asOf: d('2023-01-01') });
    expect(r.candidates.map((c) => c.sourceType).sort()).toEqual(['법률', '시행규칙', '시행규칙', '시행령']);
    expect(new Set(r.candidates.map((c) => c.lawId)).size).toBe(r.candidates.length);
  });
  it('같은 시행일 충돌은 하나로 확정하지 않고 needs-check', async () => {
    const m = makeAdapter(() => ({ text: fixtureText('search-eflaw-same-day-conflict') }));
    const r = await new LegalService(m.adapter, undefined, fixedNow).search({ query: '건축법', asOf: d('2023-01-01') });
    expect(r.candidates[0].inForce).toBeNull();
    expect(r.candidates[0].verification).toBe('needs-check');
    expect(r.candidates[0].note).toContain('확인 필요');
  });
  it('해석 실패 항목은 warnings로 전달된다', async () => {
    expect((await mk().service.search({ query: '건축법' })).warnings).toHaveLength(2);
  });
  it('검증되지 않은 계약에서는 어떤 후보도 verified가 아니다', async () => {
    const r = await mk().service.search({ query: '건축법', asOf: d('2023-01-01') });
    expect(r.candidates.every((c) => c.verification !== 'verified')).toBe(true);
    expect(r.candidates.find((c) => c.inForce)!.note).toContain('검증되지 않은');
  });
});

describe('조문 조회', () => {
  it('기준일 시행 버전의 조문 원문과 식별자를 돌려준다', async () => {
    const r = await mk().service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(2), branchNo: null }], asOf: d('2023-01-01') });
    expect(r.version).toMatchObject({ lawId: 'SYN-L1', mst: 'SYN-M2', effectiveDate: '2022-06-30' });
    expect(r.articles[0].text).toContain('합성 항 1');
    expect(r.sources[0]).toMatchObject({ lawName: '건축법', article: '제2조', effectiveDate: '2022-06-30', sourceType: '법률' });
  });
  it('기준일이 이전이면 이전 버전(M1)의 조문', async () => {
    const r = await mk().service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2021-01-01') });
    expect(r.version.mst).toBe('SYN-M1');
  });
  it('가지번호 조문(제3조의2)을 조 번호와 구분해 찾는다', async () => {
    const r = await mk().service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(3), branchNo: asBranchNo(2) }, { articleNo: asArticleNo(3), branchNo: null }], asOf: d('2023-01-01') });
    expect(r.articles).toHaveLength(1);
    expect(r.sources[0].article).toBe('제3조의2');
    expect(r.missing).toEqual([{ articleNo: 3, branchNo: null }]); // 제3조(가지 없음)는 없음
    expect(r.warnings.join(' ')).toContain('제3조');
  });
  it('일부 조문이 없으면 needs-check + missing 표시, 전부 없으면 LAW_NOT_FOUND', async () => {
    const { service } = mk();
    const part = await service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }, { articleNo: asArticleNo(99), branchNo: null }], asOf: d('2023-01-01') });
    expect(part.verification).toBe('needs-check');
    expect(part.missing).toHaveLength(1);
    expect(await code(service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(99), branchNo: null }], asOf: d('2023-01-01') }))).toBe('LAW_NOT_FOUND');
  });
  it('기준일에 시행 중인 버전이 없으면 LAW_NOT_FOUND (가까운 버전을 임의로 쓰지 않음)', async () => {
    expect(await code(mk().service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2019-01-01') }))).toBe('LAW_NOT_FOUND');
  });
  it('시행 예정 버전의 조문은 기준일이 시행일 이후일 때만 조회 대상 (미래 버전 본문 없음 → BAD_RESPONSE)', async () => {
    // 합성 라우터는 M3 본문을 제공하지 않는다 → 알 수 없는 응답은 추정하지 않고 오류
    expect(await code(mk().service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2031-01-01') }))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
  it('같은 시행일 충돌이면 LAW_VERSION_AMBIGUOUS', async () => {
    const m = makeAdapter(() => ({ text: fixtureText('search-eflaw-same-day-conflict') }));
    const s = new LegalService(m.adapter, undefined, fixedNow);
    expect(await code(s.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2023-01-01') }))).toBe('LAW_VERSION_AMBIGUOUS');
  });
  it('연혁 목록은 시행일 오름차순', async () => {
    const r = await mk().service.versions(L1);
    expect(r.versions.map((v) => v.mst)).toEqual(['SYN-M1', 'SYN-M2', 'SYN-M3']);
  });
  it('검증되지 않은 계약에서는 verified가 아니며 경고가 붙는다', async () => {
    const r = await mk().service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2023-01-01') });
    expect(r.verification).toBe('needs-check');
    expect(r.warnings.join(' ')).toContain('검증되지 않은');
    expect(r.warnings.join(' ')).toContain('공식 URL');
  });
});

describe('캐시', () => {
  it('같은 버전 본문은 재호출하지 않는다', async () => {
    const { service, calls } = mk();
    const req = { lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2023-01-01') };
    await service.articles(req);
    const n = calls.length;
    await service.articles(req);
    expect(calls.length).toBe(n);
  });
  it('다른 버전(mst)은 다른 키 — 기준일이 바뀌면 해당 버전 본문을 새로 조회', async () => {
    const { service, calls } = mk();
    await service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2023-01-01') });
    const before = calls.filter((c) => c.url.pathname.endsWith('lawService.do')).length;
    await service.articles({ lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2021-01-01') });
    expect(calls.filter((c) => c.url.pathname.endsWith('lawService.do')).length).toBe(before + 1);
  });
  it('TTL이 지나면 다시 조회', async () => {
    let t = Date.parse('2026-10-14T00:00:00Z');
    const m = makeAdapter();
    const s = new LegalService(m.adapter, { bodyMs: 1000, searchMs: 1000 }, () => new Date(t));
    await s.search({ query: '건축법' });
    const n = m.calls.length;
    await s.search({ query: '건축법' });
    expect(m.calls.length).toBe(n);
    t += 1500;
    await s.search({ query: '건축법' });
    expect(m.calls.length).toBe(n + 1);
  });
});

describe('verified 표시 규칙 (테스트 전용 어댑터)', () => {
  // 실제 응답으로 계약이 검증된 어댑터(live-verified)에서만 verified가 나올 수 있음을 확인한다. 실제 연동이 아님.
  const wrap = (status: ContractStatus, url: string | null): LawSourceAdapter => {
    const base = makeAdapter().adapter;
    return { name: 'test', contractStatus: status, searchVersions: (q, t) => base.searchVersions(q, t), listVersions: (id) => base.listVersions(id), getBody: (v) => base.getBody(v), officialUrl: () => url };
  };
  const req = { lawId: L1, articles: [{ articleNo: asArticleNo(1), branchNo: null }], asOf: d('2023-01-01') };
  it('live-verified + 공식 URL + 누락 없음 → verified', async () => {
    expect((await new LegalService(wrap('live-verified', 'https://example.test/x'), undefined, fixedNow).articles(req)).verification).toBe('verified');
  });
  it('live-verified여도 공식 URL이 없으면 needs-check', async () => {
    expect((await new LegalService(wrap('live-verified', null), undefined, fixedNow).articles(req)).verification).toBe('needs-check');
  });
  it('synthetic 계약이면 URL이 있어도 needs-check', async () => {
    expect((await new LegalService(wrap('synthetic', 'https://example.test/x'), undefined, fixedNow).articles(req)).verification).toBe('needs-check');
  });
});

