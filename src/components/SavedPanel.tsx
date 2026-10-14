interface Props { saved: string[]; visible: boolean; onOpen: (q: string) => void }

export function SavedPanel({ saved, visible, onOpen }: Props) {
  return (
    <section className="surface-card saved-panel" id="savedPanel" style={{ display: visible ? 'block' : 'none' }}>
      <div className="section-heading"><h2>저장한 답변</h2><span className="subtle">이 브라우저에만 저장됩니다</span></div>
      <div id="savedList">
        {saved.length === 0
          ? <p className="history-empty">저장된 답변이 없습니다. 답변 카드 오른쪽 상단의 북마크를 눌러 추가해 보세요.</p>
          : saved.map((q) => <div className="saved-item" key={q}><span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>{q}</span><button onClick={() => onOpen(q)}>열어보기</button></div>)}
      </div>
    </section>
  );
}
