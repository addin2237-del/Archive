import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { clients } from './api';
import { safeGetRaw, safeSave } from './api/storage';
import { safeLoad } from './api/storage';
import { DEFAULT_QUESTION, getDemoAnswer } from './data/demoTopics';
import { DEFAULT_MODEL_ID, MODELS } from './data/models';
import { useToast } from './hooks/useToast';
import type { LegalAnswer, UsageSummary } from './types';
import type { NavKey } from './types/ui';
import { AnswerCard } from './components/AnswerCard';
import { CoverageCalculator } from './components/CoverageCalculator';
import { GlossaryCards } from './components/GlossaryCards';
import { Header } from './components/Header';
import { HistoryPanel } from './components/HistoryPanel';
import { IconSprite, Icon } from './components/Icon';
import { Hero } from './components/Hero';
import { ModelSelector } from './components/ModelSelector';
import { QuestionSearch } from './components/QuestionSearch';
import { SavedPanel } from './components/SavedPanel';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { UsageMonitor } from './components/UsageMonitor';

const HISTORY_KEY = 'archilaw_demo_history';
const SAVED_KEY = 'archilaw_demo_saved';
const MODEL_KEY = 'archilaw_demo_ai_model_v2';
const THEME_KEY = 'archilaw_theme';
const DEFAULT_HISTORY = ['건폐율이 뭐야? 계산 예시도 알려줘', '다락은 언제 연면적에 포함될까?'];
const BREADCRUMBS: Record<NavKey, string> = { home: '법령 AI 검색', search: '법령 검색', saved: '저장한 답변', calc: '빠른 계산기', guide: '이용 안내' };
const EMPTY_SUMMARY: UsageSummary = { month: '', budgetKRW: 10000, spentKRW: 0, totalTokens: 0, lastInputTokens: 0, lastOutputTokens: 0, lastCostKRW: 0, isSample: true };

const scrollTo = (id: string, block: ScrollLogicalPosition = 'start') => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block });

export default function App() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const [nav, setNav] = useState<NavKey>('home');
  const [question, setQuestion] = useState('');
  const [activeQuestion, setActiveQuestion] = useState(DEFAULT_QUESTION);
  const [answer, setAnswer] = useState<LegalAnswer>(() => getDemoAnswer(DEFAULT_QUESTION));
  const [answerVersion, setAnswerVersion] = useState(0);
  const [history, setHistory] = useState<string[]>(() => { const h = safeLoad<string[]>(HISTORY_KEY, []); return h.length ? h : DEFAULT_HISTORY; });
  const [saved, setSaved] = useState<string[]>(() => safeLoad<string[]>(SAVED_KEY, []));
  const [modelId, setModelId] = useState(() => { const m = safeGetRaw(MODEL_KEY); return MODELS.some((x) => x.id === m) ? (m as string) : DEFAULT_MODEL_ID; });
  const [summary, setSummary] = useState<UsageSummary>(EMPTY_SUMMARY);
  const { toast, showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  const showHome = nav !== 'saved';

  useEffect(() => { clients.usage.getSummary().then(setSummary); }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);

  const toggleTheme = () => setDark((d) => { const next = !d; safeSave(THEME_KEY, next ? 'dark' : 'light'); return next; });

  const submitQuestion = useCallback(async (raw?: string) => {
    const q = (raw ?? question).trim();
    if (!q) { textareaRef.current?.focus(); showToast('질문을 먼저 입력해 주세요.'); return; }
    const res = await clients.legal.search(q);
    if (res.status === 'error') { showToast(res.error.message); return; }
    setQuestion(q);
    setHistory((h) => { const next = [q, ...h.filter((v) => v !== q)].slice(0, 8); safeSave(HISTORY_KEY, next); return next; });
    setActiveQuestion(q);
    setAnswer(res.data);
    setAnswerVersion((v) => v + 1);
    flushSync(() => setNav((n) => (n === 'saved' ? 'home' : n)));
    scrollTo('answerSection');
    showToast('예시 답변입니다 · 실제 법령 API 연결 전');
  }, [question, showToast]);

  const toggleSave = () => {
    const has = saved.includes(activeQuestion);
    const next = has ? saved.filter((q) => q !== activeQuestion) : [activeQuestion, ...saved];
    setSaved(next); safeSave(SAVED_KEY, next);
    showToast(has ? '저장 목록에서 제거했어요.' : '내 질문함에 저장했어요.');
  };

  const copyAnswer = async () => {
    const lead = answer.leadParts.map((p) => p.text).join('');
    const text = `질문: ${activeQuestion}\n\n${answer.title}\n${lead}\n\n※ UI 시연용 데이터이며 법령 조회 결과가 아닙니다.`;
    try { await navigator.clipboard.writeText(text); showToast('시연 답변을 복사했어요.'); }
    catch {
      const box = document.createElement('textarea'); box.value = text; document.body.appendChild(box); box.select();
      try { document.execCommand('copy'); showToast('시연 답변을 복사했어요.'); } catch { showToast('복사가 제한된 브라우저입니다.'); }
      box.remove();
    }
  };

  const onNav = (key: NavKey) => {
    flushSync(() => setNav(key));
    if (key === 'saved') { scrollTo('savedPanel'); return; }
    if (key === 'search') { scrollTo('searchArea'); textareaRef.current?.focus(); }
    else if (key === 'calc') scrollTo('calculator', 'center');
    else if (key === 'guide') { scrollTo('glossary', 'center'); showToast('현재는 시연용 UI입니다. 공식 법령 검색 기능은 개발 예정입니다.'); }
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeModel = (id: string) => { setModelId(id); safeSave(MODEL_KEY, id); };
  const changeBudget = async (n: number) => setSummary(await clients.usage.setBudget(n));

  const applySampleUsage = async () => {
    const draft = await clients.ai.sampleUsage(model.id);
    const res = await clients.usage.record({ model: model.id, provider: model.provider, tier: model.tier }, draft);
    setSummary(res.summary);
    if (res.status === 'blocked') { showToast('샘플 유료 사용량이 월 예산을 초과하므로 차단했습니다.'); return; }
    showToast(`시연 사용량 반영: 입력 ${draft.inputTokens.toLocaleString()} · 출력 ${draft.outputTokens.toLocaleString()} 토큰 / ₩${draft.costKRW.toLocaleString('ko-KR')}`);
  };

  return (
    <>
      <IconSprite />
      <div className="app">
        <Sidebar active={nav} onNav={onNav} dark={dark} onToggleTheme={toggleTheme} />
        <main className="workspace">
          <Header breadcrumb={BREADCRUMBS[nav]} modelStatus={model.tier === 'paid' ? '유료 모델 · 미연결' : '무료 모델 · 미연결'} dark={dark} onToggleTheme={toggleTheme} />
          <div className="content">
            <Hero />
            <QuestionSearch value={question} onChange={setQuestion} onSubmit={() => submitQuestion()} onChip={submitQuestion} textareaRef={textareaRef}
              modelSelector={<ModelSelector models={MODELS} value={modelId} onChange={changeModel} />} />
            <div id="mainContent" style={{ display: showHome ? 'block' : 'none' }}>
              <div className="main-grid">
                <section className="main-section" id="answerSection">
                  <div className="section-heading"><h2><Icon name="spark" style={{ color: '#607DDD' }} /> AI 법령 해설</h2><span className="subtle">답변 예시 미리보기</span></div>
                  <AnswerCard key={answerVersion} answer={answer} saved={saved.includes(activeQuestion)} onToggleSave={toggleSave} onCopy={copyAnswer} />
                </section>
                <aside className="side-section">
                  <div className="section-heading"><h2>실무 도구</h2><span className="subtle">자주 사용하는 기능</span></div>
                  <CoverageCalculator />
                  <UsageMonitor summary={summary} model={model} onBudgetChange={changeBudget} onBudgetInvalid={() => showToast('월 예산은 100~1,000,000원으로 입력하세요.')} onSampleUsage={applySampleUsage} />
                  <HistoryPanel history={history} onPick={submitQuestion} />
                </aside>
              </div>
              <GlossaryCards onPick={submitQuestion} />
            </div>
            <SavedPanel saved={saved} visible={!showHome} onOpen={submitQuestion} />
            <div className="footer">ARCHI LAW NOTES · 개인용 UI 프로토타입 · 실제 법률 자문 및 법령 조회 기능은 연결되지 않았습니다.</div>
          </div>
        </main>
      </div>
      <Toast message={toast.message} show={toast.show} />
    </>
  );
}
