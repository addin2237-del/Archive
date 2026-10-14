import type { SourceType } from '../../../src/types';
import type { ArticleRef, LawVersionRef } from '../../../src/types/legal';
import type { LawId } from '../../../src/types/ids';

/**
 * 계약 검증 상태. 'live-verified'가 아니면 서비스는 응답을 'verified'로 표시하지 않는다.
 *  - 'unconfigured': 인증값 없음 (호출 불가)
 *  - 'synthetic'   : 테스트용 합성 데이터 / 실제 API 응답으로 확인되지 않은 가정
 *  - 'live-verified': 실제 법제처 응답(tests/fixtures/law/raw)으로 매핑을 확인함
 */
export type ContractStatus = 'unconfigured' | 'synthetic' | 'live-verified';

export interface SearchHit { versions: LawVersionRef[]; warnings: string[] }

/** 조문 본문 (해당 버전 안에서의 조문 단위) */
export interface RawArticle { ref: ArticleRef; title: string | null; text: string }
export interface VersionBody { version: LawVersionRef; articles: RawArticle[] }

/**
 * 법령 원천 어댑터 경계. 법제처 직접 호출·(선택) 외부 MCP 호출을 모두 이 인터페이스 뒤에 둔다.
 * 구현은 식별자(법령ID/일련번호/시행일/조문번호)를 섞지 않고 정규화된 모델만 반환해야 하며,
 * 해석할 수 없는 응답은 추정하지 말고 LegalError('LAW_UPSTREAM_BAD_RESPONSE')를 던진다.
 */
export interface LawSourceAdapter {
  readonly name: string;
  readonly contractStatus: ContractStatus;
  /** 키워드로 법령 버전들을 검색 (시행일 기준). */
  searchVersions(query: string, sourceTypes: SourceType[] | undefined): Promise<SearchHit>;
  /** 한 법령(lawId)의 모든 버전 */
  listVersions(lawId: LawId): Promise<LawVersionRef[]>;
  /** 특정 버전(mst)의 조문 본문. 응답의 법령ID·시행일이 요청 버전과 다르면 BAD_RESPONSE. */
  getBody(version: LawVersionRef): Promise<VersionBody>;
  /** 사람이 열어볼 공식 URL. 모르면 null (추정한 URL을 만들지 않는다). */
  officialUrl?(version: LawVersionRef): string | null;
}
