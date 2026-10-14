# 아키로 (ARCHI LAW NOTES) — Phase 1 UI

`reference/archilaw-apple-budget-ui.html`(디자인 원본)을 React + Vite + TypeScript로 이식한 개인용 UI 시안입니다.

> **현재 상태: 전부 Mock입니다.** 법령 검색, AI 해설, 토큰·비용, 예산은 모두 브라우저 안의 시연 데이터이며
> 실제 법령 API · MCP · AI 공급자 · 결제 · 로그인은 연결되어 있지 않습니다. 법령 답변은 `verification: 'demo'`로 표시됩니다.
> 개발 지시서: [`docs/prompts/ARCHILAW_CLAUDE_MASTER_PROMPT_v1_1.md`](docs/prompts/ARCHILAW_CLAUDE_MASTER_PROMPT_v1_1.md)

## Phase 2 진행 상황 (법령 원문 조회) — 설계 단계
실제 법제처 API는 **아직 연결·검증되지 않았습니다.** 현재까지는 설계와 접속 준비만 있습니다.
- [`docs/phase2/01-design.md`](docs/phase2/01-design.md) — `/v1/legal/*` 계약, 식별자 모델, 오류 규약, 구현 순서
- [`docs/phase2/02-mcp-review.md`](docs/phase2/02-mcp-review.md) — 오픈소스 법령 MCP 검토와 채택 방침
- [`docs/phase2/03-setup-guide.md`](docs/phase2/03-setup-guide.md) — 도메인 허용, OC 신청, 환경변수(`LAW_OC`) 등록
- `node scripts/probe-law-api.mjs` — 연결·OC 확인 및 원본 응답 보관 (연결 후 실행)

## 실행
```bash
npm install
npm run dev          # 개발 서버
npm run build        # 타입체크 + 빌드
```

## 테스트
| 명령 | 내용 |
|---|---|
| `npm run test` | 단위 → UI 순서로 모두 실행. 하나라도 실패하면 종료 코드 1 |
| `npm run test:unit` | Vitest. 질문 분류, 예산 차단, 초기 로딩·저장소 오류 처리 (`tests/unit/`) |
| `npm run test:ui` | Playwright(Chromium). 기능 / 반응형 / 원본 대비 시각 비교 (`tests/ui/`) |
| `npm run typecheck` | `tsc --noEmit` (src, tests 포함) |

- UI 테스트는 `npm run build` 후 `vite preview`(4173)를 자동으로 띄웁니다.
- 처음 실행하는 환경에서는 `npx playwright install chromium`이 필요할 수 있습니다.
- CI: `.github/workflows/ci.yml` — 타입 검사, 빌드, 단위 테스트, UI 테스트 (실패 시 리포트 업로드).
- 시각 비교 결과(차이 픽셀 수와 위치)는 `test-results/visual/*.txt`에 기록됩니다.

### 검증 항목
- **기능** (`functional.spec.ts`, 23개): 입력(Enter / Shift+Enter / 빈 질문 / 대체 답변), 추천 질문·용어 카드 분류, 탭, 북마크·저장 목록·히스토리, 복사, 건폐율 계산, 테마, 모델 선택·예산 입력·샘플 사용량·예산 차단, localStorage 차단 시 동작
- **반응형** (`responsive.spec.ts`, 24개): 1536 / 1240 / 1000 / 760 / 400 / 390px × 라이트·다크 — 가로 스크롤, 요소 겹침, 텍스트 잘림·화면 밖 요소, 콘솔 오류, 주요 버튼 동작
- **시각 비교** (`visual.spec.ts`, 12개): 위 6개 폭 × 2 테마를 디자인 원본과 픽셀 비교 (허용 0.05%)
- **단위** (37개): 주제 분류 규칙, 예산 100원 시나리오(0+40 허용 / 80+40 차단 / 100 이후 차단 / 무료 샘플 구분), 초기 로딩

## 질문 분류 규칙 (시연용)
질문 분석 엔진이 아니라 결정적 규칙입니다. 주제를 직접 가리키는 용어(`다락`, `건폐율`, `용적률`, `포치·데크`, `이격`)가 있으면 그것만 비교하고,
없을 때만 보조 용어(`연면적`, `건축면적`, `층고` 등)를 비교합니다. 같은 단계에서 겹치면 질문에서 먼저 나온 용어의 주제를 고릅니다.
(`다락은 연면적에 포함될까?` → 다락, `건폐율과 용적률 차이` → 건폐율)

## 구조
```
src/
  styles/app.css          원본 CSS 그대로 (디자인 잠금)
  types/                  공통 API 계약 타입 (RequestContext, LegalSource, UsageEvent, ApiResult …)
  api/clients.ts          LegalSearchClient / AIProviderClient / UsageClient 인터페이스
  api/mock/               Mock 어댑터 (브라우저 localStorage 시연용)
  api/index.ts            어댑터 주입 지점 — 이후 /v1 HTTP 클라이언트로 교체
  bootstrap.ts            첫 화면 데이터(모델 목록·사용량·기본 답변)를 렌더 전에 로딩, 항목별 실패 처리
  data/                   시연 답변 · 모델 목록(로딩 실패 시 대체 목록)
  components/             Sidebar, Header, Hero, QuestionSearch, ModelSelector, AnswerCard,
                          CoverageCalculator, UsageMonitor, BudgetSettings, BudgetAlert,
                          HistoryPanel, GlossaryCards, SavedPanel, Toast
tests/unit, tests/ui      테스트
reference/                디자인 원본 HTML + 기준 캡처
docs/prompts/             개발 지시서 v1.1 및 UI 가이드
docs/captures/            원본 vs React 캡처
```

## 검증 결과 (최신)
- 원본 대비 픽셀 차이: 12개 조합 모두 0.0000~0.0035% 이하 (1~43px). 남은 차이는 1~9px 수준으로 안티앨리어싱 범위입니다.
- 이 중 가장 컸던 차이(약 36px)는 "무엇이 궁금하신가요?" 아이콘의 `sparkle` 클래스 누락이었고 수정했습니다.
- 가로 스크롤·요소 겹침·텍스트 잘림·콘솔 오류: 6개 폭 × 라이트·다크에서 모두 없음.
