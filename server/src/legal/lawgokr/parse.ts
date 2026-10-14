/**
 * 법제처 DRF(JSON) 응답 → 정규화 모델. ※ 필드명은 공식 문서를 직접 확인하지 못한 **가정**이다
 * (제3자 구현·일반 지식 기반). 실제 응답 확인 후 이 파일만 수정하면 된다.
 * 원칙: 해석할 수 없으면 추정하지 않고 LAW_UPSTREAM_BAD_RESPONSE.
 */
import type { SourceType } from '../../../../src/types';
import { asArticleNo, asBranchNo, asLawId, asLawMst, fromCompactDate } from '../../../../src/types/ids';
import type { ArticleRef, LawVersionRef } from '../../../../src/types/legal';
import { LegalError } from '../../errors';
import type { RawArticle, SearchHit, VersionBody } from '../source';

const bad = (msg: string) => new LegalError('LAW_UPSTREAM_BAD_RESPONSE', `법제처 응답을 해석할 수 없습니다: ${msg}`);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
/** XML→JSON 변환에서 항목이 1개면 객체, 여러 개면 배열로 오는 경우를 모두 배열로 */
const toArray = (x: unknown): unknown[] => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x.trim() : typeof x === 'number' ? String(x) : null);

/** 법령명·법령구분명으로 출처 종류 판정. 판정 불가면 null (임의로 '법률'로 간주하지 않는다) */
export function toSourceType(lawName: string, kind: string | null): SourceType | null {
  if (/\s시행규칙$/.test(lawName)) return '시행규칙';
  if (/\s시행령$/.test(lawName)) return '시행령';
  if (kind === '법률') return '법률';
  if (kind === '대통령령') return '시행령';
  if (kind === '총리령' || kind === '부령') return '시행규칙';
  return null;
}

export function parseSearch(body: unknown): SearchHit {
  if (!isObj(body) || !isObj(body.EflawSearch)) throw bad('검색 응답의 최상위 구조(EflawSearch)가 없습니다');
  const root = body.EflawSearch;
  const items = toArray(root.law);
  const versions: LawVersionRef[] = [];
  const warnings: string[] = [];
  items.forEach((raw, i) => {
    if (!isObj(raw)) { warnings.push(`항목 ${i + 1}: 객체가 아님`); return; }
    const name = str(raw['법령명한글']);
    const idS = str(raw['법령ID']);
    const mstS = str(raw['법령일련번호']);
    const eff = fromCompactDate(raw['시행일자']);
    if (!name || !idS || !mstS || !eff) { warnings.push(`항목 ${i + 1}: 필수 값(법령명/ID/일련번호/시행일) 누락 또는 형식 오류`); return; }
    const type = toSourceType(name, str(raw['법령구분명']));
    if (!type) { warnings.push(`항목 ${i + 1}(${name}): 출처 종류를 판정할 수 없어 제외`); return; }
    try {
      versions.push({ lawId: asLawId(idS), mst: asLawMst(mstS), lawName: name, sourceType: type, effectiveDate: eff,
        promulgationDate: fromCompactDate(raw['공포일자']), promulgationNo: str(raw['공포번호']) });
    } catch { warnings.push(`항목 ${i + 1}(${name}): 식별자 형식 오류`); }
  });
  if (items.length > 0 && versions.length === 0) throw bad('모든 검색 항목이 해석에 실패했습니다');
  return { versions, warnings };
}

/** 항·호·목의 내용 문자열을 순서대로 모은다 (항내용 → 호내용 → 목내용) */
function collectNested(node: unknown, level: '항' | '호' | '목', out: string[]): void {
  for (const n of toArray(node)) {
    if (!isObj(n)) continue;
    for (const c of toArray(n[`${level}내용`])) { const t = str(c); if (t) out.push(t); }
    if (level === '항') collectNested(n['호'], '호', out);
    if (level === '호') collectNested(n['목'], '목', out);
  }
}

export function parseBody(body: unknown, requested: LawVersionRef): VersionBody {
  if (!isObj(body) || !isObj(body['법령'])) throw bad('본문 응답의 최상위 구조(법령)가 없습니다');
  const law = body['법령'];
  const info = law['기본정보'];
  if (!isObj(info)) throw bad('기본정보가 없습니다');
  // 식별자 혼용 방지: 요청한 버전과 응답의 법령ID·시행일이 일치해야 한다
  if (str(info['법령ID']) !== requested.lawId) throw bad('응답의 법령ID가 요청과 다릅니다');
  const eff = fromCompactDate(info['시행일자']);
  if (eff !== requested.effectiveDate) throw bad('응답의 시행일이 요청한 버전과 다릅니다');
  const jo = isObj(law['조문']) ? law['조문'] : null;
  const units = jo ? toArray(jo['조문단위']) : [];
  if (units.length === 0) throw bad('조문이 비어 있습니다');
  const articles: RawArticle[] = [];
  for (const u of units) {
    if (!isObj(u) || str(u['조문여부']) !== '조문') continue; // '전문'(장·절 제목 등) 제외
    const noS = str(u['조문번호']);
    if (!noS || !/^\d+$/.test(noS)) throw bad('조문번호 형식 오류');
    const brS = str(u['조문가지번호']);
    if (brS !== null && !/^\d+$/.test(brS)) throw bad('조문가지번호 형식 오류');
    const ref: ArticleRef = { articleNo: asArticleNo(Number(noS)), branchNo: brS ? asBranchNo(Number(brS)) : null, articleKey: str(u['조문키']) };
    const parts: string[] = [];
    for (const c of toArray(u['조문내용'])) { const t = str(c); if (t) parts.push(t); }
    collectNested(u['항'], '항', parts);
    if (parts.length === 0) throw bad(`제${noS}조 본문이 비어 있습니다`);
    articles.push({ ref, title: str(u['조문제목']), text: parts.join('\n') });
  }
  if (articles.length === 0) throw bad('조문 단위를 찾지 못했습니다');
  return { version: requested, articles };
}
