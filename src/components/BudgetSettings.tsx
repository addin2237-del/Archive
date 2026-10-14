import { useEffect, useState } from 'react';

interface Props { budget: number; onCommit: (n: number) => void; onInvalid: () => void }

export function BudgetSettings({ budget, onCommit, onInvalid }: Props) {
  const [text, setText] = useState(String(budget));
  useEffect(() => setText(String(budget)), [budget]);
  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n) || n < 100 || n > 1000000) { setText(String(budget)); onInvalid(); return; }
    if (Math.round(n) !== budget) onCommit(Math.round(n));
    else setText(String(budget));
  };
  return (
    <div className="usage-budget-row">
      <label htmlFor="budgetAmount">월 지출 상한</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input id="budgetAmount" type="number" min="100" max="1000000" step="100" inputMode="numeric" value={text}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} />
        <span>원</span>
      </div>
    </div>
  );
}
