import type { KeyboardEvent, ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onChip: (q: string) => void;
  modelSelector: ReactNode;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const CHIPS = [
  { label: '건폐율', query: '건폐율이 뭐야? 계산 예시도 알려줘' },
  { label: '용적률', query: '용적률이란 무엇이고 어떻게 계산해?' },
  { label: '다락 기준', query: '다락은 언제 연면적에 포함될까?' },
  { label: '포치 · 데크', query: '포치와 데크가 건축면적에 포함돼?' },
];

export function QuestionSearch({ value, onChange, onSubmit, onChip, modelSelector, textareaRef }: Props) {
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); }
  };
  return (
    <section className="search-panel" id="searchArea" aria-label="건축법령 질문하기">
      <div className="search-label"><Icon name="spark" size="sm" /> 무엇이 궁금하신가요?</div>
      <div className="query-row">
        <label className="sr-only" htmlFor="questionInput">법령에 관해 질문하기</label>
        <textarea id="questionInput" ref={textareaRef} rows={2} placeholder="예) 대지 100평에 건폐율 40%면 건물을 몇 평까지 지을 수 있어?" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} />
        <button className="ask-btn" id="askBtn" onClick={onSubmit}>질문하기 <Icon name="arrow" size="sm" /></button>
      </div>
      {modelSelector}
      <div className="search-footer">
        <div className="prompt-chips"><span className="prompt-name">추천 질문</span>{CHIPS.map((c) => <button key={c.label} className="chip" onClick={() => onChip(c.query)}>{c.label}</button>)}</div>
        <span className="input-help">Enter 질문 · Shift + Enter 줄바꿈</span>
      </div>
    </section>
  );
}
