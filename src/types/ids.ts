/**
 * 서로 다른 식별자를 타입으로 구분한다. 같은 문자열이어도 서로 대입할 수 없다.
 * (법령ID와 법령일련번호를 바꿔 쓰면 엉뚱한 시점의 조문이 조회되므로 컴파일 단계에서 막는다.)
 */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** 법령ID — 개정되어도 유지되는 법령 종류 식별자 */
export type LawId = Brand<string, 'LawId'>;
/** 법령일련번호(MST) — 개정 버전마다 달라지는 특정 시점 본문 식별자 */
export type LawMst = Brand<string, 'LawMst'>;
/** 시행일 등 날짜 — YYYY-MM-DD (법제처 원본 YYYYMMDD는 어댑터에서 변환) */
export type IsoDate = Brand<string, 'IsoDate'>;
/** 조 번호 (제3조의2 → 3) */
export type ArticleNo = Brand<number, 'ArticleNo'>;
/** 가지번호 (제3조의2 → 2). 가지 없음은 null */
export type BranchNo = Brand<number, 'BranchNo'>;

const ID_RE = /^[0-9A-Za-z_-]{1,32}$/;

export const asLawId = (s: string): LawId => {
  if (!ID_RE.test(s)) throw new TypeError(`잘못된 법령ID: ${s}`);
  return s as LawId;
};
export const asLawMst = (s: string): LawMst => {
  if (!ID_RE.test(s)) throw new TypeError(`잘못된 법령일련번호: ${s}`);
  return s as LawMst;
};
export const isValidIsoDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // 2026-02-31 같은 날짜 거부
};
export const asIsoDate = (s: string): IsoDate => {
  if (!isValidIsoDate(s)) throw new TypeError(`잘못된 날짜: ${s}`);
  return s as IsoDate;
};
export const asArticleNo = (n: number): ArticleNo => {
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new TypeError(`잘못된 조 번호: ${n}`);
  return n as ArticleNo;
};
export const asBranchNo = (n: number): BranchNo => {
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new TypeError(`잘못된 가지번호: ${n}`);
  return n as BranchNo;
};

/** 법제처 원본 날짜(YYYYMMDD) → IsoDate. 형식이 다르면 null (추정하지 않는다) */
export const fromCompactDate = (s: unknown): IsoDate | null => {
  if (typeof s !== 'string' || !/^\d{8}$/.test(s)) return null;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return isValidIsoDate(iso) ? (iso as IsoDate) : null;
};
