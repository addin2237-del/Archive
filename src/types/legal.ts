/**
 * `/v1/legal/*` 계약 (Phase 2). 법제처 응답을 정규화한 우리 쪽 모델이며 법제처 원본 필드명과 무관하다.
 * 설계: docs/phase2/01-design.md — 법령ID·일련번호·시행일·조문번호를 섞지 않는다.
 */
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
  | 'INVALID_REQUEST';

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
};

/** 법령 한 건의 한 버전. lawId는 법령 종류, mst는 개정 버전을 식별한다. */
export interface LawVersionRef {
  lawId: string;
  mst: string; // 법령일련번호
  lawName: string;
  sourceType: SourceType;
  effectiveDate: string; // 시행일 YYYY-MM-DD
  promulgationDate: string | null;
  promulgationNo: string | null;
}

export interface ArticleRef {
  articleNo: number; // 조 (제3조의2 → 3)
  branchNo: number | null; // 가지번호 (제3조의2 → 2)
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
  asOf?: string; // 기준일 YYYY-MM-DD. 없으면 서버가 오늘(Asia/Seoul)
}
export interface LegalSearchCandidate {
  version: LawVersionRef;
  pending: boolean; // 기준일 이후 시행 예정
}
export interface LegalSearchResponse {
  asOf: string;
  candidates: LegalSearchCandidate[];
}

// ── POST /v1/legal/articles ─────────────────────────────────
export interface LegalArticlesRequest {
  lawId: string;
  articles: Pick<ArticleRef, 'articleNo' | 'branchNo'>[];
  asOf?: string;
}
export interface LegalArticlesResponse {
  asOf: string;
  articles: LegalArticle[];
  sources: LegalSource[];
  verification: VerificationStatus; // 'verified' | 'needs-check' (시행일·조문번호·출처 중 빠진 것이 있으면)
  retrievedAt: string;
}

// ── GET /v1/legal/versions ──────────────────────────────────
export interface LegalVersionsResponse {
  lawId: string;
  versions: LawVersionRef[]; // 시행일 오름차순
}
