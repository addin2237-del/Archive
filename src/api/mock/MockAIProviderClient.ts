import type { AIProviderClient } from '../clients';
import { FALLBACK_MODELS } from '../../data/models';

// 시연 전용 가상 단가: 입력 $3/1M, 출력 $15/1M, 1달러 = 1,336원. 실제 가격이 아니다.
const DEMO_INPUT = 5120;
const DEMO_OUTPUT = 960;

export class MockAIProviderClient implements AIProviderClient {
  async listModels() {
    return FALLBACK_MODELS;
  }
  async sampleUsage(modelId: string) {
    const costKRW = modelId === 'paid-demo' ? Math.round(((DEMO_INPUT * 3 + DEMO_OUTPUT * 15) / 1_000_000) * 1336) : 0;
    return { inputTokens: DEMO_INPUT, outputTokens: DEMO_OUTPUT, costKRW, isSample: true as const };
  }
}
