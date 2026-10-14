import { Icon } from './Icon';

export function Hero() {
  return (
    <section className="hero" id="hero">
      <span className="hero-chip"><Icon name="spark" size="sm" /> 법률은 정확하게, 설명은 쉽게</span>
      <div className="hero-text"><div className="eyebrow">YOUR PERSONAL ARCHITECTURE LAW ASSISTANT</div><h1>복잡한 건축법,<br />질문 하나로 쉽게.</h1><p>법령을 찾는 시간은 줄이고, 이해하는 시간은 늘리세요.<br />나만의 건축 실무 AI 검색 노트.</p></div>
      <svg className="hero-art" viewBox="0 0 400 240" aria-hidden="true"><circle cx="223" cy="113" r="102" className="glow" /><circle cx="223" cy="113" r="100" className="fine" /><circle cx="223" cy="113" r="75" className="fine" /><path d="M65 178 L197 71 L323 178 V223 H65Z" className="fine" /><path d="M130 173 L197 122 L263 173 V223 H130Z" className="fine" /><path d="M150 223v-55h95v55M175 223v-46h44v46M197 71V38M65 178h258M102 178v45M292 178v45" className="fine" /><path d="M64 190h260M65 205h259" className="fine" /><path d="M15 223h365M15 234h365M337 78v145M347 78v145M332 84h21M332 196h21" className="fine" /></svg>
    </section>
  );
}
