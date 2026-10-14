import { Icon } from './Icon';

const CARDS = [
  { title: '건폐율', desc: '대지면적 중 건축면적이 차지하는 비율', query: '건폐율이 뭐야? 계산 예시도 알려줘' },
  { title: '용적률', desc: '대지면적에 대한 용적률 산정용 연면적의 비율', query: '용적률이란 무엇이고 어떻게 계산해?' },
  { title: '다락 기준', desc: '층고와 구조, 산정 기준을 함께 검토', query: '다락은 언제 연면적에 포함될까?' },
];

export function GlossaryCards({ onPick }: { onPick: (q: string) => void }) {
  return (
    <section className="glossary" id="glossary">
      <div className="section-heading"><h2>자주 찾는 건축 용어</h2><span className="subtle">카드를 눌러 예시 답변 보기</span></div>
      <div className="glossary-grid">
        {CARDS.map((c) => <button key={c.title} className="glossary-card" onClick={() => onPick(c.query)}><strong>{c.title} <Icon name="arrow" size="sm" /></strong><p>{c.desc}</p></button>)}
      </div>
    </section>
  );
}
