import { beforeEach, describe, expect, it } from 'vitest';
import { MockAIProviderClient } from '../../src/api/mock/MockAIProviderClient';
import { MockUsageClient } from '../../src/api/mock/MockUsageClient';

const month = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 7);
const seed = (budget: number, won: number) => {
  localStorage.setItem('archilaw_demo_budget_v2', String(budget));
  localStorage.setItem('archilaw_demo_usage_v2', JSON.stringify({ month, won, allTokens: 0, input: 0, output: 0, lastCost: 0 }));
};
const paid = { model: 'paid-demo', provider: 'paid-demo', tier: 'paid' as const };
const free = { model: 'gemini-free', provider: 'gemini', tier: 'free' as const };
const ai = new MockAIProviderClient();

let usage: MockUsageClient;
beforeEach(() => { localStorage.clear(); usage = new MockUsageClient(); });

describe('샘플 요금', () => {
  it('유료 샘플은 40원, 무료/로컬은 0원', async () => {
    expect((await ai.sampleUsage('paid-demo')).costKRW).toBe(40);
    expect((await ai.sampleUsage('gemini-free')).costKRW).toBe(0);
    expect((await ai.sampleUsage('ollama-local')).costKRW).toBe(0);
  });
});

describe('월 예산 차단 (유료)', () => {
  it('예산 100 / 누적 0 / 요청 40 → 허용', async () => {
    seed(100, 0);
    const res = await usage.record(paid, await ai.sampleUsage('paid-demo'));
    expect(res.status).toBe('recorded');
    expect(res.summary.spentKRW).toBe(40);
  });

  it('예산 100 / 누적 80 / 요청 40 → 차단, 누적 불변', async () => {
    seed(100, 80);
    const res = await usage.record(paid, await ai.sampleUsage('paid-demo'));
    expect(res.status).toBe('blocked');
    expect(res.summary.spentKRW).toBe(80);
    expect((await usage.getSummary()).spentKRW).toBe(80);
    expect((await usage.getSummary()).totalTokens).toBe(0);
  });

  it('예산 100 / 누적 100 → 추가 유료 요청 차단', async () => {
    seed(100, 100);
    const res = await usage.record(paid, await ai.sampleUsage('paid-demo'));
    expect(res.status).toBe('blocked');
    expect((await usage.getSummary()).spentKRW).toBe(100);
  });

  it('누적이 예산에 정확히 도달하는 요청(60+40)은 허용되고 그 이후는 차단', async () => {
    seed(100, 60);
    expect((await usage.record(paid, await ai.sampleUsage('paid-demo'))).status).toBe('recorded');
    expect((await usage.record(paid, await ai.sampleUsage('paid-demo'))).status).toBe('blocked');
  });

  it('차단된 뒤 예산을 올리면 다시 허용', async () => {
    seed(100, 100);
    await usage.setBudget(1000);
    expect((await usage.record(paid, await ai.sampleUsage('paid-demo'))).status).toBe('recorded');
  });
});

describe('무료 모델 샘플 요청은 예산 차단과 구분', () => {
  it('예산 100% 소진 상태에서도 무료 샘플은 허용되고 비용은 늘지 않는다', async () => {
    seed(100, 100);
    const res = await usage.record(free, await ai.sampleUsage('gemini-free'));
    expect(res.status).toBe('recorded');
    expect(res.summary.spentKRW).toBe(100);
    expect(res.summary.totalTokens).toBe(6080);
  });
});

describe('예산·저장소', () => {
  it('기본 예산은 10,000원', async () => {
    expect((await usage.getSummary()).budgetKRW).toBe(10000);
  });
  it('저장된 예산을 첫 조회에서 그대로 반환', async () => {
    seed(3000, 0);
    expect((await usage.getSummary()).budgetKRW).toBe(3000);
  });
  it('지난달 사용량은 새 달에 초기화된다', async () => {
    localStorage.setItem('archilaw_demo_usage_v2', JSON.stringify({ month: '2000-01', won: 999, allTokens: 5, input: 1, output: 1, lastCost: 9 }));
    expect((await usage.getSummary()).spentKRW).toBe(0);
  });
  it('깨진 저장 데이터가 있어도 기본값으로 동작', async () => {
    localStorage.setItem('archilaw_demo_usage_v2', '{broken');
    expect((await usage.getSummary()).spentKRW).toBe(0);
  });
  it('localStorage 접근이 막혀 있어도 예외 없이 동작', async () => {
    const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', { value: bad, configurable: true });
    try {
      const u = new MockUsageClient();
      expect((await u.getSummary()).budgetKRW).toBe(10000);
      await expect(u.setBudget(500)).resolves.toBeTruthy();
    } finally {
      Object.defineProperty(window, 'localStorage', orig);
    }
  });
});
