import type { ApiClients } from './api';
import { DEFAULT_QUESTION } from './data/demoTopics';
import { FALLBACK_MODELS } from './data/models';
import type { AIModelOption, LegalAnswer, UsageSummary } from './types';

export interface BootstrapData {
  models: AIModelOption[];
  summary: UsageSummary | null; // null = 불러오기 실패 (기본값으로 위장하지 않는다)
  answer: LegalAnswer | null;
  warnings: string[];
}

/**
 * 첫 화면에 필요한 데이터를 렌더 전에 모두 불러온다.
 * 저장된 월 예산이 기본값으로 잠깐 보이는 깜빡임을 막고, 각 항목의 실패를 개별 처리한다.
 */
export async function loadInitialData(clients: ApiClients): Promise<BootstrapData> {
  const warnings: string[] = [];
  const [models, summary, answer] = await Promise.all([
    clients.ai.listModels().then((m) => (m.length ? m : null), () => null),
    clients.usage.getSummary().catch(() => null),
    clients.legal.search(DEFAULT_QUESTION).then((r) => (r.status === 'ok' ? r.data : null), () => null),
  ]);
  if (!models) warnings.push('모델 목록을 불러오지 못해 기본 목록을 사용합니다.');
  if (!summary) warnings.push('사용량 정보를 불러오지 못했습니다.');
  if (!answer) warnings.push('예시 답변을 불러오지 못했습니다.');
  return { models: models ?? FALLBACK_MODELS, summary, answer, warnings };
}
