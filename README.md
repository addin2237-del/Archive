# 아키로 (ARCHI LAW NOTES) — Phase 1 UI

`reference/archilaw-apple-budget-ui.html`(디자인 원본)을 React + Vite + TypeScript로 이식한 개인용 UI 시안입니다.
**모든 답변·토큰·비용은 샘플/데모이며 실제 법령 API, MCP, AI 호출, 로그인, 결제는 연결되어 있지 않습니다.**

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 타입체크 + 빌드
```

## 구조
```
src/
  styles/app.css          원본 CSS 그대로 (디자인 잠금)
  types/                  공통 API 계약 타입 (RequestContext, LegalSource, UsageEvent, ApiResult …)
  api/clients.ts          LegalSearchClient / AIProviderClient / UsageClient 인터페이스
  api/mock/               Mock 어댑터 (브라우저 localStorage 시연용)
  api/index.ts            어댑터 주입 지점 — Phase 2~3에서 /v1 HTTP 클라이언트로 교체
  data/                   시연 답변 · 모델 목록
  components/             Sidebar, Header, Hero, QuestionSearch, ModelSelector, AnswerCard,
                          CoverageCalculator, UsageMonitor, BudgetSettings, BudgetAlert,
                          HistoryPanel, GlossaryCards, SavedPanel, Toast
reference/                디자인 원본 HTML + 기준 캡처
docs/captures/            원본 vs React 캡처 및 픽셀 diff
```

## 검증 결과
| 화면 | 크기 | 원본과 다른 픽셀 |
|---|---|---|
| PC | 1536×1030 (full page 1893) | 32px (0.0011%) |
| 모바일 | 390×844 (full page 2783) | 38px (0.0035%) |
| 다크 | 1536×1030 | 37px (0.0013%) |

가로 스크롤 없음, 콘솔 오류 0건, `tsc --noEmit` 및 `vite build` 통과.
