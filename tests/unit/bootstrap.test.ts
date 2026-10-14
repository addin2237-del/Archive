import { describe, expect, it } from 'vitest';
import { clients } from '../../src/api';
import type { ApiClients } from '../../src/api';
import { loadInitialData } from '../../src/bootstrap';
import { FALLBACK_MODELS } from '../../src/data/models';

describe('초기 데이터 로딩', () => {
  it('저장된 예산을 첫 데이터에 포함한다 (기본값으로 깜빡이지 않음)', async () => {
    localStorage.setItem('archilaw_demo_budget_v2', '3000');
    const data = await loadInitialData(clients);
    expect(data.summary?.budgetKRW).toBe(3000);
    expect(data.models.length).toBeGreaterThan(0);
    expect(data.answer?.topicKey).toBe('coverage');
    expect(data.warnings).toEqual([]);
  });

  it('각 항목 실패를 개별 처리한다 (0원으로 위장하지 않음)', async () => {
    const boom = async () => { throw new Error('fail'); };
    const failing: ApiClients = {
      legal: { search: boom },
      ai: { listModels: boom, sampleUsage: boom },
      usage: { getSummary: boom, setBudget: boom, record: boom },
    };
    const data = await loadInitialData(failing);
    expect(data.models).toBe(FALLBACK_MODELS);
    expect(data.summary).toBeNull();
    expect(data.answer).toBeNull();
    expect(data.warnings).toHaveLength(3);
  });

  it('법령 검색이 오류 응답이면 답변을 만들어내지 않는다', async () => {
    const c: ApiClients = { ...clients, legal: { search: async () => ({ status: 'error', requestId: 'x', error: { code: 'E', message: 'm', retryable: false } }) } };
    expect((await loadInitialData(c)).answer).toBeNull();
  });
});
