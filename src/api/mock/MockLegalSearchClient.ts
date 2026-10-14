import type { LegalSearchClient } from '../clients';
import { getDemoAnswer } from '../../data/demoTopics';

// 실제 법령 조회 없음. 항상 verification: 'demo' 인 시연 답변을 돌려준다.
export class MockLegalSearchClient implements LegalSearchClient {
  async search(question: string) {
    return { status: 'ok' as const, requestId: `demo-${Date.now()}`, data: getDemoAnswer(question) };
  }
}
