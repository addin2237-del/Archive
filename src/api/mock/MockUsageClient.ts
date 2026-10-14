import type { RecordUsageResult, UsageClient } from '../clients';
import type { UsageSummary } from '../../types';
import { safeGetRaw, safeLoad, safeSave } from '../storage';

const BUDGET_KEY = 'archilaw_demo_budget_v2';
const USAGE_KEY = 'archilaw_demo_usage_v2';
const DEFAULT_BUDGET = 10000;

// 월 경계는 Asia/Seoul 기준.
const currentMonth = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 7);

interface StoredUsage {
  month: string;
  won: number;
  allTokens: number;
  input: number;
  output: number;
  lastCost: number;
}
const emptyUsage = (): StoredUsage => ({ month: currentMonth(), won: 0, allTokens: 0, input: 0, output: 0, lastCost: 0 });

// 브라우저 시연 상태만 갱신한다. 실제 백엔드에서는 서버가 예약·정산·차단을 원자적으로 처리해야 한다.
export class MockUsageClient implements UsageClient {
  private read() {
    const budget = Number(safeGetRaw(BUDGET_KEY)) || DEFAULT_BUDGET;
    let usage = safeLoad<StoredUsage>(USAGE_KEY, emptyUsage());
    if (usage.month !== currentMonth()) usage = emptyUsage();
    return { budget, usage };
  }
  private summary(budget: number, u: StoredUsage): UsageSummary {
    return { month: u.month, budgetKRW: budget, spentKRW: u.won, totalTokens: u.allTokens, lastInputTokens: u.input,
      lastOutputTokens: u.output, lastCostKRW: u.lastCost, isSample: true };
  }
  async getSummary() {
    const { budget, usage } = this.read();
    return this.summary(budget, usage);
  }
  async setBudget(budgetKRW: number) {
    safeSave(BUDGET_KEY, String(Math.round(budgetKRW)));
    return this.getSummary();
  }
  async record(_event: Parameters<UsageClient['record']>[0], draft: Parameters<UsageClient['record']>[1]): Promise<RecordUsageResult> {
    const { budget, usage } = this.read();
    if (draft.costKRW > 0 && usage.won + draft.costKRW > budget) {
      return { status: 'blocked', reason: 'budget-exceeded', summary: this.summary(budget, usage) };
    }
    const next: StoredUsage = { month: currentMonth(), input: draft.inputTokens, output: draft.outputTokens, lastCost: draft.costKRW,
      allTokens: usage.allTokens + draft.inputTokens + draft.outputTokens, won: usage.won + draft.costKRW };
    safeSave(USAGE_KEY, next);
    return { status: 'recorded', summary: this.summary(budget, next) };
  }
}
