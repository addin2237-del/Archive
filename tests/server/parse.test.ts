import { describe, expect, it } from 'vitest';
import { LegalError } from '../../server/src/errors';
import { parseBody, parseSearch, toSourceType } from '../../server/src/legal/lawgokr/parse';
import { asIsoDate, asLawId, asLawMst } from '../../src/types/ids';
import type { LawVersionRef } from '../../src/types/legal';
import { fixtureBody } from './fixtures';

const ver = (over: Partial<LawVersionRef> = {}): LawVersionRef => ({ lawId: asLawId('SYN-L1'), mst: asLawMst('SYN-M2'), lawName: '건축법', sourceType: '법률', effectiveDate: asIsoDate('2022-06-30'), promulgationDate: null, promulgationNo: null, ...over });
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return e instanceof LegalError ? e.code : 'OTHER'; } return 'NO_ERROR'; };

describe('검색 응답 파싱 (합성 데이터)', () => {
  const hit = parseSearch(fixtureBody('search-eflaw-multi'));
  it('식별자를 별도 필드로 분리한다 (법령ID / 일련번호 / 시행일 / 공포일)', () => {
    const m2 = hit.versions.find((v) => v.mst === 'SYN-M2')!;
    expect(m2.lawId).toBe('SYN-L1');
    expect(m2.effectiveDate).toBe('2022-06-30'); // YYYYMMDD → ISO
    expect(m2.promulgationDate).toBe('2022-01-01');
    expect(m2.sourceType).toBe('법률');
  });
  it('시행 예정 버전도 목록에 포함 (현행 여부는 서비스가 기준일로 판단)', () => {
    expect(hit.versions.map((v) => v.mst)).toContain('SYN-M3');
  });
  it('시행령·시행규칙을 법령명/구분으로 판정', () => {
    expect(hit.versions.find((v) => v.lawId === 'SYN-L2')!.sourceType).toBe('시행령');
    expect(hit.versions.find((v) => v.lawId === 'SYN-L3')!.sourceType).toBe('시행규칙');
    expect(hit.versions.find((v) => v.lawId === 'SYN-L4')!.sourceType).toBe('시행규칙');
  });
  it('해석할 수 없는 항목은 추정하지 않고 경고와 함께 제외', () => {
    expect(hit.versions.some((v) => v.lawId === 'SYN-L9')).toBe(false); // 구분 불명
    expect(hit.versions.some((v) => v.lawId === 'SYN-L8')).toBe(false); // 시행일 없음
    expect(hit.warnings).toHaveLength(2);
  });
  it('결과 1건이 배열이 아닌 객체여도 처리', () => {
    expect(parseSearch(fixtureBody('search-eflaw-single')).versions).toHaveLength(1);
  });
  it('0건은 빈 목록', () => {
    expect(parseSearch(fixtureBody('search-eflaw-empty')).versions).toEqual([]);
  });
  it('최상위 구조가 다르거나 모든 항목이 깨졌으면 BAD_RESPONSE', () => {
    expect(code(() => parseSearch({ 다른: 1 }))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
    expect(code(() => parseSearch(null))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
    expect(code(() => parseSearch(fixtureBody('search-eflaw-all-bad')))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
});

describe('출처 종류 판정', () => {
  it.each([['건축법 시행규칙', null, '시행규칙'], ['건축법 시행령', '대통령령', '시행령'], ['건축법', '법률', '법률'], ['어떤 규칙', '부령', '시행규칙'], ['어떤 규칙', '총리령', '시행규칙'], ['건축법', '고시', null], ['건축법', null, null]] as const)('%s / %s → %s', (n, k, t) => {
    expect(toSourceType(n, k)).toBe(t);
  });
});

describe('본문 파싱 (합성 데이터)', () => {
  const body = parseBody(fixtureBody('body-law-m2'), ver());
  it('전문(장·절 제목)은 제외하고 조문만 남긴다', () => {
    expect(body.articles.map((a) => `${a.ref.articleNo}${a.ref.branchNo ? '-' + a.ref.branchNo : ''}`)).toEqual(['1', '2', '3-2']);
  });
  it('조문번호와 가지번호를 구분한다 (제3조의2 → 3, 2)', () => {
    const a = body.articles[2];
    expect(a.ref.articleNo).toBe(3);
    expect(a.ref.branchNo).toBe(2);
    expect(body.articles[0].ref.branchNo).toBeNull();
  });
  it('항·호·목 내용을 순서대로 합친다', () => {
    expect(body.articles[1].text.split('\n')).toEqual(['제2조(정의) 합성 본문 ①', '① 합성 항 1', '1. 합성 호 1', '가. 합성 목 1', '2. 합성 호 2', '② 합성 항 2']);
  });
  it('요청 버전의 식별자를 그대로 돌려준다', () => { expect(body.version.mst).toBe('SYN-M2'); });
  it('응답의 법령ID가 요청과 다르면 거부 (식별자 혼용 방지)', () => {
    expect(code(() => parseBody(fixtureBody('body-mismatch-id'), ver()))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
  it('응답의 시행일이 요청 버전과 다르면 거부 (엉뚱한 시점의 조문 방지)', () => {
    expect(code(() => parseBody(fixtureBody('body-mismatch-date'), ver()))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
  it('조문이 비었거나 본문이 빈 조문이 있으면 BAD_RESPONSE', () => {
    expect(code(() => parseBody(fixtureBody('body-empty'), ver()))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
    expect(code(() => parseBody(fixtureBody('body-article-without-text'), ver()))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
    expect(code(() => parseBody({ 법령: {} }, ver()))).toBe('LAW_UPSTREAM_BAD_RESPONSE');
  });
});
