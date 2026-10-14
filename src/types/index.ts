/**
 * 공통 API 계약 타입 (Phase 1: 타입 정의 + Mock 전용).
 * 미래 팀 프로그램(견적·상담)이 같은 `/v1` 서비스를 호출할 때 재사용한다.
 */

// ── 요청 콘텍스트 ──────────────────────────────────────────────
// 외부 공개 시 userId/organizationId는 서버가 인증 정보로 부여해야 하며,
// 클라이언트가 보낸 값을 신뢰하지 않는다.
export interface RequestContext {
  requestId: string;
  userId: string; // 개인용: 'local-owner'
  organizationId: string; // 개인용: 'personal'
  clientApp: string; // 예: 'archilaw-personal-ui'
  requestedAt: string; // ISO 8601
  policyId: string;
}

// ── 공통 응답 ─────────────────────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
}

export type ApiResult<T> =
  | { status: 'ok'; requestId: string; data: T }
  | { status: 'error'; requestId: string; error: ApiError };

// ── 법령 출처 ─────────────────────────────────────────────────
export type SourceType = '법률' | '시행령' | '시행규칙' | '조례' | '해석례' | '참고자료';

/** 'demo'는 시연 데이터. 'needs-check'는 '확인 필요' 표기 대상. */
export type VerificationStatus = 'demo' | 'verified' | 'needs-check' | 'failed';

export interface LegalSource {
  sourceId: string;
  sourceType: SourceType;
  lawName: string;
  article: string;
  effectiveDate: string | null; // 불명확하면 null → '확인 필요'
  jurisdiction: string;
  officialUrl: string | null;
  retrievedAt: string | null;
}

export interface LeadPart {
  text: string;
  strong?: boolean;
}

export interface AnswerVisual {
  graphic: string;
  label: string;
  value: string;
  showPyeongUnit: boolean;
  copy: string;
  stripPercent: number;
}

/** 질문·근거·설명·주의점·검증 상태를 분리해 저장할 수 있는 답변 구조 */
export interface LegalAnswer {
  question: string;
  topicKey: string;
  title: string;
  leadParts: LeadPart[];
  visual: AnswerVisual;
  points: string[];
  sourceLabel: string;
  sources: LegalSource[];
  reviewSteps: string[];
  verification: VerificationStatus;
  isFallback: boolean; // 매칭되는 시연 주제가 없을 때 true
}

// ── AI 모델 / 사용량 ─────────────────────────────────────────
export type ModelTier = 'free' | 'local' | 'paid';

export interface AIModelOption {
  id: string;
  provider: string;
  optionLabel: string; // 선택기 표시명
  shortLabel: string; // 사용량 카드 표시명
  tier: ModelTier;
}

/** 공급자별 원시 사용량을 정규화한 값. 추론/캐시 토큰 중복 계산 금지. */
export interface UsageEvent {
  requestId: string;
  userId: string;
  organizationId: string;
  clientApp: string;
  provider: string;
  model: string;
  tier: ModelTier;
  status: 'success' | 'blocked' | 'error';
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheTokens: number;
  providerReportedUsage: boolean;
  priceVersion: string;
  estimatedCostUSD: number | null; // null = 추정 불가 (0원으로 처리하지 않는다)
  fxRate: number | null;
  estimatedCostKRW: number | null;
  recordedAt: string;
  isSample: boolean;
}

export interface UsageSummary {
  month: string; // 'YYYY-MM' (Asia/Seoul)
  budgetKRW: number;
  spentKRW: number;
  totalTokens: number;
  lastInputTokens: number;
  lastOutputTokens: number;
  lastCostKRW: number;
  isSample: boolean;
}

export type BudgetLevel = 'ok' | 'notice' | 'warning' | 'blocked';

export interface SampleUsageDraft {
  inputTokens: number;
  outputTokens: number;
  costKRW: number;
  isSample: true;
}
