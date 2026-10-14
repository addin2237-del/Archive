import { useState } from 'react';
import { Icon } from './Icon';
import type { LegalAnswer } from '../types';
import type { AnswerTab } from '../types/ui';

interface Props { answer: LegalAnswer; saved: boolean; onToggleSave: () => void; onCopy: () => void }

const TABS: { key: AnswerTab; label: string }[] = [
  { key: 'summary', label: '쉬운 해설' },
  { key: 'source', label: '관련 법령' },
  { key: 'case', label: '검토 포인트' },
];

export function AnswerCard({ answer, saved, onToggleSave, onCopy }: Props) {
  const [tab, setTab] = useState<AnswerTab>('summary');
  const v = answer.visual;
  return (
    <div className="surface-card answer-card">
      <div className="answer-top">
        <div className="answer-status">
          <span className="state"><span className="demo-dot"></span> 예시 답변</span>
          <div className="answer-tools">
            <button className="icon-btn" id="bookmarkBtn" title="저장하기" aria-label="답변 저장하기" aria-pressed={saved} style={{ background: saved ? 'var(--pill)' : 'transparent' }} onClick={onToggleSave}><Icon name="bookmark" size="sm" /></button>
            <button className="icon-btn" id="copyBtn" title="답변 복사" aria-label="답변 복사" onClick={onCopy}><Icon name="copy" size="sm" /></button>
          </div>
        </div>
        <h2 id="answerTitle">{answer.title}</h2>
        <p className="lead" id="answerLead">{answer.leadParts.map((p, i) => (p.strong ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}</p>
        <div className="notice"><Icon name="info" size="sm" /><span>이 화면은 디자인 검토용입니다. 아래 답변·법령 카드는 시연 데이터이며 공식 API 조회나 AI 검증을 거치지 않았습니다.</span></div>
      </div>
      <div className="tabs" role="tablist" aria-label="답변 보기">
        {TABS.map((t) => (
          <button key={t.key} className="tab" role="tab" aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} id={`tab-${t.key}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id="panel-summary" aria-labelledby="tab-summary" hidden={tab !== 'summary'}>
        <div className="body-title" id="summaryHeading">{answer.isFallback ? '검색 결과 미리보기' : '숫자와 사례로 이해하기'}</div>
        <div className="illustration">
          <div className="ratio-graphic"><div className="building">{v.graphic}</div></div>
          <div className="illustration-body">
            <div className="ratio-label">{v.label}</div>
            <div className="ratio-number">{v.value}{v.showPyeongUnit && <span> 평</span>}</div>
            <div className="ratio-copy">{v.copy}</div>
            <div className="ratio-strip"><span style={{ width: `${v.stripPercent}%` }}></span></div>
          </div>
        </div>
        <ul className="itemized" id="summaryList">{answer.points.map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
      <div className="tab-panel" role="tabpanel" id="panel-source" aria-labelledby="tab-source" hidden={tab !== 'source'}>
        <div className="body-title">관련 법령 연결 예정</div>
        <div className="source-item"><div className="source-icon"><Icon name="file" /></div><div><strong id="sourceMain">{answer.sourceLabel}</strong><small>공식 법제처 원문 연결 전 · 실제 조회 결과 아님</small></div></div>
        <div className="source-item"><div className="source-icon"><Icon name="book" /></div><div><strong>용도지역별 조례 및 개별 규제</strong><small>지자체·대지 정보 확인 후 결과 제공 예정</small></div></div>
        <p className="source-note">실제 구현 시 시행일, 조문 번호, 출처, 공식 원문 링크, 지역별 조례 적용 여부를 함께 표시합니다.</p>
        <a href="https://www.law.go.kr" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 800, color: '#607DDD', marginTop: 9 }}>국가법령정보센터 홈페이지 <Icon name="external" size="sm" /></a>
      </div>
      <div className="tab-panel" role="tabpanel" id="panel-case" aria-labelledby="tab-case" hidden={tab !== 'case'}>
        <div className="case-title">답변 전 확인할 항목</div>
        <div id="caseSteps">{answer.reviewSteps.map((s, i) => <div className="case-step" key={s}><span className="step-count">{String(i + 1).padStart(2, '0')}</span><span>{s}</span></div>)}</div>
      </div>
    </div>
  );
}
