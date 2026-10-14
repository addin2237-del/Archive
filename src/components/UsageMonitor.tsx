import { Icon } from './Icon';
import { BudgetAlert } from './BudgetAlert';
import { BudgetSettings } from './BudgetSettings';
import type { AIModelOption, UsageSummary } from '../types';

interface Props {
  summary: UsageSummary;
  model: AIModelOption;
  onBudgetChange: (n: number) => void;
  onBudgetInvalid: () => void;
  onSampleUsage: () => void;
}

const money = (n: number) => '₩' + Math.max(0, Math.round(n)).toLocaleString('ko-KR');
const num = (n: number) => n.toLocaleString('ko-KR');

export function UsageMonitor({ summary, model, onBudgetChange, onBudgetInvalid, onSampleUsage }: Props) {
  const paid = model.tier === 'paid';
  const pct = Math.round((100 * summary.spentKRW) / summary.budgetKRW);
  const feedbackClass = pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '';
  const feedback = paid
    ? pct >= 100 ? '유료 샘플 요청 제한 중 · 예산을 변경할 수 있습니다.' : '유료 AI 샘플 단가로 계산 (실제 API 가격 아님)'
    : '무료 사용 시 모델 추론 비용 0원 · 한도 별도';
  return (
    <section className="surface-card usage-card" id="usageMonitor" aria-label="AI 사용량 및 예산 관리">
      <div className="usage-head"><div className="card-title"><Icon name="calc" style={{ color: '#687CB4' }} /> AI 사용량 · 비용</div><span className="usage-tag">시연용 데이터</span></div>
      <div className="usage-total" id="usageTotal">{money(summary.spentKRW)} <small>/ 이번 달 · 샘플</small></div>
      <div className="usage-limit" id="usageBudgetLabel">설정한 월 예산 {num(summary.budgetKRW)}원 중 {pct}% 사용</div>
      <div className="usage-progress"><span id="usageFill" className={pct >= 100 ? 'over' : pct >= 80 ? 'warn' : ''} style={{ width: `${Math.min(100, pct)}%` }}></span></div>
      <div className="usage-markers"><span>0%</span><span>50% 주의</span><span>80% 경고</span><span>100% 중단</span></div>
      <div className="usage-meta">
        <div><span>이번 질문 입력 / 출력</span><strong id="usageTokens">{num(summary.lastInputTokens)} / {num(summary.lastOutputTokens)} 토큰</strong></div>
        <div><span>이번 질문 추정 비용</span><strong id="usageLastCost">{money(summary.lastCostKRW)}</strong></div>
        <div><span>이번 달 누적 토큰</span><strong id="usageAllTokens">{num(summary.totalTokens)} 토큰</strong></div>
        <div><span>선택한 모델</span><strong id="usageModel">{model.shortLabel}</strong></div>
      </div>
      <BudgetSettings budget={summary.budgetKRW} onCommit={onBudgetChange} onInvalid={onBudgetInvalid} />
      <BudgetAlert pct={pct} />
      <div className={`usage-feedback${feedbackClass}`} id="usageFeedback">{feedback}</div>
      <button type="button" className="demo-usage-btn" id="usageTest" disabled={paid && pct >= 100} onClick={onSampleUsage}>{paid ? '샘플 유료 질문 1회 반영' : '샘플 무료 질문 1회 반영'}</button>
      <p className="usage-footnote">샘플 버튼은 실제 AI 요청이나 결제를 하지 않습니다. 실제 버전에서는 API 응답의 토큰 사용량으로 계산하며, 유료 한도 초과 요청을 서버에서 차단합니다. 무료 모델 한도 소진 시 유료 전환은 사전 확인이 필요합니다.</p>
    </section>
  );
}
