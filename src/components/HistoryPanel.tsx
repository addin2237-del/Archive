import { Icon } from './Icon';

export function HistoryPanel({ history, onPick }: { history: string[]; onPick: (q: string) => void }) {
  return (
    <section className="surface-card history-card">
      <div className="card-topline" style={{ marginBottom: 5 }}><div className="card-title"><Icon name="clock" style={{ color: '#687CB4' }} /> 최근 질문</div><span className="card-hint">이 기기에 저장</span></div>
      <ul className="history-list" id="historyList">
        {history.slice(0, 5).map((q) => (
          <li key={q}><button className="history-button" onClick={() => onPick(q)}><Icon name="clock" size="sm" style={{ color: 'var(--muted)' }} /><span>{q}</span><Icon name="arrow" size="sm" style={{ color: 'var(--muted)' }} /></button></li>
        ))}
      </ul>
    </section>
  );
}
