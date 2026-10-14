/**
 * `/v1/legal/*` 계약 (Phase 2). 법제처 응답을 정규화한 우리 쪽 모델이며 법제처 원본 필드명과 무관하다.
 * 설계: docs/phase2/01-design.md — 법령ID·일련번호·시행일·조문번호를 섞지 않는다.
 */
import type { ArticleNo, BranchNo, IsoDate, LawId, LawMst } from './ids';
import type { LegalSource, SourceType, VerificationStatus } from './index';

export type LegalErrorCode =
  | 'LAW_UPSTREAM_FORBIDDEN'
  | 'LAW_OC_INVALID'
  | 'LAW_UPSTREAM_TIMEOUT'
  | 'LAW_UPSTREAM_UNAVAILABLE'
  | 'LAW_RATE_LIMITED'
  | 'LAW_UPSTREAM_BAD_RESPONSE'
  | 'LAW_NOT_FOUND'
  | 'LAW_VERSION_AMBIGUOUS'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';

/** 재시도해도 되는 오류인지. (ApiError.retryable 값의 단일 출처) */
export const LEGAL_ERROR_RETRYABLE: Record<LegalErrorCode, boolean> = {
  LAW_UPSTREAM_FORBIDDEN: false,
  LAW_OC_INVALID: false,
  LAW_UPSTREAM_TIMEOUT: true,
  LAW_UPSTREAM_UNAVAILABLE: true,
  LAW_RATE_LIMITED: true,
  LAW_UPSTREAM_BAD_RESPONSE: false,
  LAW_NOT_FOUND: false,
  LAW_VERSION_AMBIGUOUS: false,
  INVALID_REQUEST: false,
  INTERNAL_ERROR: false,
};

/** 법령 한 건의 한 버전. lawId는 법령 종류, mst는 개정 버전을 식별한다. */
export interface LawVersionRef {
  lawId: LawId;
  mst: LawMst; // 법령일련번호
  lawName: string;
  sourceType: SourceType;
  effectiveDate: IsoDate; // 시행일
  promulgationDate: IsoDate | null;
  promulgationNo: string | null;
}

export interface ArticleRef {
  articleNo: ArticleNo; // 조 (제3조의2 → 3)
  branchNo: BranchNo | null; // 가지번호 (제3조의2 → 2)
  articleKey: string | null; // 법제처 조문 식별자가 있으면
}

export interface LegalArticle {
  version: LawVersionRef;
  ref: ArticleRef;
  title: string | null; // 조문 제목
  text: string; // 조문 원문 (항·호·목 포함)
}

// ── POST /v1/legal/search ───────────────────────────────────
export interface LegalSearchRequest {
  query: string;
  sourceTypes?: SourceType[];
  asOf?: IsoDate; // 기준일. 없으면 서버가 오늘(Asia/Seoul)
}
/** 법령(lawId) 하나당 후보 하나. 기준일에 시행 중인 버전과 시행 예정 버전을 분리해 보여준다. */
export interface LegalSearchCandidate {
  lawId: LawId;
  lawName: string;
  sourceType: SourceType;
  inForce: LawVersionRef | null; // 기준일에 시행 중인 버전. 없으면 null
  upcoming: LawVersionRef[]; // 기준일 이후 시행 예정 (현행으로 표시하지 않는다)
  verification: VerificationStatus; // 버전을 하나로 확정하지 못하면 'needs-check'
  note: string | null;
}
export interface LegalSearchResponse {
  asOf: IsoDate;
  candidates: LegalSearchCandidate[];
  warnings: string[]; // 해석하지 못해 제외한 항목 등
  retrievedAt: string;
}

// ── POST /v1/legal/articles ─────────────────────────────────
export interface LegalArticlesRequest {
  lawId: LawId;
  articles: Pick<ArticleRef, 'articleNo' | 'branchNo'>[];
  asOf?: IsoDate;
}
export interface LegalArticlesResponse {
  asOf: IsoDate;
  version: LawVersionRef; // 실제로 조회한 버전 (lawId + mst + 시행일)
  articles: LegalArticle[];
  missing: Pick<ArticleRef, 'articleNo' | 'branchNo'>[]; // 요청했지만 해당 버전에서 찾지 못한 조문
  sources: LegalSource[];
  warnings: string[];
  verification: VerificationStatus; // 'verified' | 'needs-check' (시행일·조문번호·출처 중 빠진 것이 있으면)
  retrievedAt: string;
}

// ── GET /v1/legal/versions ──────────────────────────────────
export interface LegalVersionsResponse {
  lawId: LawId;
  versions: LawVersionRef[]; // 시행일 오름차순
}
