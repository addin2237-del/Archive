/**
 * UI가 의존하는 서비스 경계. 공급자 SDK나 API 키를 UI가 직접 다루지 않는다.
 * 미래 매핑: LegalSearchClient → POST /v1/legal/search,
 *            AIProviderClient   → POST /v1/ai/explain, GET /v1/providers,
 *            UsageClient        → GET /v1/usage/summary
 * Phase 1에는 ./mock 의 어댑터만 존재한다.
 */
import type {
  AIModelOption,
  ApiResult,
  LegalAnswer,
  SampleUsageDraft,
  UsageEvent,
  UsageSummary,
} from '../types';

export interface LegalSearchClient {
  search(question: string): Promise<ApiResult<LegalAnswer>>;
}

export interface AIProviderClient {
  listModels(): Promise<AIModelOption[]>;
  /** Phase 1: 가상의 샘플 사용량. 실제 AI 호출 없음. */
  sampleUsage(modelId: string): Promise<SampleUsageDraft>;
}

export type RecordUsageResult =
  | { status: 'recorded'; summary: UsageSummary }
  | { status: 'blocked'; reason: 'budget-exceeded'; summary: UsageSummary };

export interface UsageClient {
  getSummary(): Promise<UsageSummary>;
  setBudget(budgetKRW: number): Promise<UsageSummary>;
  /** 유료 요청이 예산을 넘으면 기록하지 않고 'blocked'를 반환한다. */
  record(event: Pick<UsageEvent, 'model' | 'provider' | 'tier'>, draft: SampleUsageDraft): Promise<RecordUsageResult>;
}

export interface ApiClients {
  legal: LegalSearchClient;
  ai: AIProviderClient;
  usage: UsageClient;
}
