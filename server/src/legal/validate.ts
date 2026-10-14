import type { SourceType } from '../../../src/types';
import { asArticleNo, asBranchNo, asIsoDate, asLawId, isValidIsoDate } from '../../../src/types/ids';
import type { IsoDate, LawId } from '../../../src/types/ids';
import type { ArticleRef, LegalArticlesRequest, LegalSearchRequest } from '../../../src/types/legal';
import { LegalError } from '../errors';

const SOURCE_TYPES: SourceType[] = ['법률', '시행령', '시행규칙', '조례', '해석례', '참고자료'];
const bad = (m: string) => new LegalError('INVALID_REQUEST', m);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

function optDate(x: unknown, field: string): IsoDate | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x !== 'string' || !isValidIsoDate(x)) throw bad(`${field}은(는) YYYY-MM-DD 형식의 실제 날짜여야 합니다`);
  return asIsoDate(x);
}
export function parseLawId(x: unknown): LawId {
  if (typeof x !== 'string') throw bad('lawId가 필요합니다');
  try { return asLawId(x); } catch { throw bad('lawId 형식이 올바르지 않습니다'); }
}

/** 알 수 없는 필드(userId, organizationId 등)는 무시한다. 신원은 서버가 정한다. */
export function parseSearchRequest(raw: unknown): LegalSearchRequest {
  if (!isObj(raw)) throw bad('요청 본문이 객체여야 합니다');
  const q = raw.query;
  if (typeof q !== 'string') throw bad('query가 필요합니다');
  const query = q.trim();
  if (query.length < 1 || query.length > 100) throw bad('query는 1~100자여야 합니다');
  if (CONTROL.test(query)) throw bad('query에 제어 문자를 넣을 수 없습니다');
  let sourceTypes: SourceType[] | undefined;
  if (raw.sourceTypes !== undefined) {
    if (!Array.isArray(raw.sourceTypes) || raw.sourceTypes.length > SOURCE_TYPES.length || !raw.sourceTypes.every((t) => SOURCE_TYPES.includes(t as SourceType))) throw bad('sourceTypes 값이 올바르지 않습니다');
    sourceTypes = raw.sourceTypes as SourceType[];
  }
  return { query, sourceTypes, asOf: optDate(raw.asOf, 'asOf') };
}

export function parseArticlesRequest(raw: unknown): LegalArticlesRequest {
  if (!isObj(raw)) throw bad('요청 본문이 객체여야 합니다');
  const lawId = parseLawId(raw.lawId);
  if (!Array.isArray(raw.articles) || raw.articles.length < 1 || raw.articles.length > 20) throw bad('articles는 1~20개여야 합니다');
  const articles = raw.articles.map((a, i): Pick<ArticleRef, 'articleNo' | 'branchNo'> => {
    if (!isObj(a)) throw bad(`articles[${i}]가 객체가 아닙니다`);
    try {
      const articleNo = asArticleNo(a.articleNo as number);
      const b = a.branchNo;
      return { articleNo, branchNo: b === undefined || b === null ? null : asBranchNo(b as number) };
    } catch { throw bad(`articles[${i}]의 조 번호/가지번호가 올바르지 않습니다`); }
  });
  return { lawId, articles, asOf: optDate(raw.asOf, 'asOf') };
}
