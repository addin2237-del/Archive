import { describe, expect, it } from 'vitest';
import { asArticleNo, asBranchNo, asIsoDate, asLawId, asLawMst, fromCompactDate, isValidIsoDate } from '../../src/types/ids';
import type { LawId, LawMst } from '../../src/types/ids';

describe('식별자 타입 구분', () => {
  it('법령ID와 일련번호는 서로 대입할 수 없다 (컴파일 단계)', () => {
    const id: LawId = asLawId('001823');
    const mst: LawMst = asLawMst('001823');
    // @ts-expect-error 법령일련번호를 법령ID 자리에 넣을 수 없다
    const wrong1: LawId = mst;
    // @ts-expect-error 법령ID를 법령일련번호 자리에 넣을 수 없다
    const wrong2: LawMst = id;
    // @ts-expect-error 평범한 문자열은 법령ID가 아니다
    const wrong3: LawId = '001823';
    // @ts-expect-error 날짜 문자열도 검증을 거쳐야 한다
    const wrong4: import('../../src/types/ids').IsoDate = '2026-01-01';
    expect([wrong1, wrong2, wrong3, wrong4]).toHaveLength(4);
  });
  it('생성 함수가 형식을 검증한다', () => {
    expect(() => asLawId('')).toThrow();
    expect(() => asLawId('a b')).toThrow();
    expect(() => asLawId('../x')).toThrow();
    expect(() => asLawMst('x'.repeat(33))).toThrow();
    expect(asLawId('SYN-L1')).toBe('SYN-L1');
  });
  it('조 번호·가지번호 범위', () => {
    expect(() => asArticleNo(0)).toThrow();
    expect(() => asArticleNo(10000)).toThrow();
    expect(() => asArticleNo(1.5)).toThrow();
    expect(() => asBranchNo(0)).toThrow(); // 가지 없음은 0이 아니라 null
    expect(asArticleNo(55)).toBe(55);
    expect(asBranchNo(2)).toBe(2);
  });
  it('날짜는 실제로 존재하는 날짜만', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(() => asIsoDate('2026-13-01')).toThrow();
  });
  it('법제처 원본 날짜(YYYYMMDD) 변환은 형식이 다르면 null (추정 안 함)', () => {
    expect(fromCompactDate('20220630')).toBe('2022-06-30');
    expect(fromCompactDate('2022-06-30')).toBeNull();
    expect(fromCompactDate('20221301')).toBeNull();
    expect(fromCompactDate(20220630)).toBeNull();
    expect(fromCompactDate(undefined)).toBeNull();
  });
});
