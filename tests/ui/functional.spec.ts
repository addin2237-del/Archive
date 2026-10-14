import { expect, test } from '@playwright/test';
import { collectErrors, openApp, text } from './helpers';

test.use({ viewport: { width: 1536, height: 1030 }, permissions: ['clipboard-read', 'clipboard-write'] });

let errors: string[];
test.beforeEach(async ({ page }) => { errors = collectErrors(page); await openApp(page); });
test.afterEach(() => { expect(errors, '콘솔 오류').toEqual([]); });

test.describe('질문 입력', () => {
  test('Shift+Enter는 줄바꿈만 하고 제출하지 않는다', async ({ page }) => {
    const ta = page.locator('#questionInput');
    await ta.fill('용적률이란 무엇이고 어떻게 계산해?');
    await ta.press('Shift+Enter');
    expect(await text(page, '#answerTitle')).toContain('건폐율');
  });
  test('Enter로 제출하면 답변과 안내 토스트가 바뀐다', async ({ page }) => {
    const ta = page.locator('#questionInput');
    await ta.fill('용적률이란 무엇이고 어떻게 계산해?');
    await ta.press('Enter');
    await expect(page.locator('#answerTitle')).toContainText('용적률');
    await expect(page.locator('#toast')).toContainText('예시 답변');
  });
  test('빈 질문은 토스트로 안내한다', async ({ page }) => {
    await page.click('#askBtn');
    await expect(page.locator('#toast')).toContainText('먼저 입력');
  });
  test('매칭 없는 질문은 대체 답변과 "검색 결과 미리보기"', async ({ page }) => {
    await page.fill('#questionInput', '아무거나 질문');
    await page.click('#askBtn');
    await expect(page.locator('#answerTitle')).toContainText('연결 예정');
    await expect(page.locator('#summaryHeading')).toHaveText('검색 결과 미리보기');
  });
});

test.describe('추천 질문 / 용어 카드 분류', () => {
  const chips: [string, string][] = [['건폐율', '건폐율은'], ['용적률', '용적률은'], ['다락 기준', '다락은'], ['포치 · 데크', '포치와 데크는']];
  for (const [label, expected] of chips) {
    test(`추천 질문 "${label}" → ${expected}`, async ({ page }) => {
      await page.click(`.chip:text-is("${label}")`);
      await expect(page.locator('#answerTitle')).toContainText(expected);
    });
  }
  test('용어 카드 "다락 기준" → 다락 답변', async ({ page }) => {
    await page.click('.glossary-card:has-text("다락 기준")');
    await expect(page.locator('#answerTitle')).toContainText('다락은');
  });
});

test.describe('답변 탭', () => {
  test('탭 3개 전환 및 새 질문 시 쉬운 해설로 복귀', async ({ page }) => {
    await page.click('#tab-source');
    await expect(page.locator('#panel-source')).toBeVisible();
    await expect(page.locator('#panel-summary')).toBeHidden();
    await page.click('#tab-case');
    await expect(page.locator('#panel-case')).toBeVisible();
    await page.click('.chip:text-is("용적률")');
    await expect(page.locator('#panel-summary')).toBeVisible();
    await expect(page.locator('#tab-summary')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('북마크 / 저장 목록 / 히스토리', () => {
  test('북마크 저장·열기·해제와 localStorage 반영', async ({ page }) => {
    await page.click('#bookmarkBtn');
    await expect(page.locator('#bookmarkBtn')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('archilaw_demo_saved'))).toContain('건폐율');
    await page.click('button.nav-item:has-text("저장한 답변")');
    await expect(page.locator('#savedPanel')).toBeVisible();
    await expect(page.locator('#mainContent')).toBeHidden();
    await page.click('#savedList button');
    await expect(page.locator('#mainContent')).toBeVisible();
    await page.click('#bookmarkBtn');
    await expect(page.locator('#bookmarkBtn')).toHaveAttribute('aria-pressed', 'false');
  });
  test('질문 히스토리가 localStorage에 저장된다', async ({ page }) => {
    await page.click('.chip:text-is("용적률")');
    await page.click('.chip:text-is("포치 · 데크")');
    const h = await page.evaluate(() => JSON.parse(localStorage.getItem('archilaw_demo_history') ?? '[]'));
    expect(h.length).toBeGreaterThanOrEqual(2);
    await page.click('.history-button >> nth=1');
    await expect(page.locator('#answerTitle')).not.toBeEmpty();
  });
  test('복사 버튼은 질문·답변·시연 안내를 복사한다', async ({ page }) => {
    await page.click('#copyBtn');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toMatch(/^질문:/);
    expect(clip).toContain('시연용');
  });
});

test.describe('건폐율 계산기', () => {
  test('계산 결과와 입력값 검증', async ({ page }) => {
    await page.fill('#siteArea', '200');
    await page.fill('#sitePercent', '60');
    await expect(page.locator('#calcResult')).toContainText('120.0');
    await page.fill('#sitePercent', '150');
    await expect(page.locator('#calcResult')).toContainText('값을 확인');
    await page.fill('#siteArea', '');
    await page.fill('#sitePercent', '40');
    await expect(page.locator('#calcResult')).toContainText('값을 확인');
  });
});

test.describe('테마', () => {
  test('다크 전환과 저장, 재방문 유지', async ({ page }) => {
    await page.click('.sidebar .theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('archilaw_theme'))).toBe('dark');
    await page.addInitScript(() => localStorage.setItem('archilaw_theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.click('.sidebar .theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('사용량 · 예산', () => {
  const setBudget = async (page: import('@playwright/test').Page, v: string) => { await page.fill('#budgetAmount', v); await page.press('#budgetAmount', 'Enter'); };

  test('무료 샘플은 토큰만 늘고 비용은 0원', async ({ page }) => {
    await page.click('#usageTest');
    await expect(page.locator('#usageAllTokens')).toHaveText('6,080 토큰');
    await expect(page.locator('#usageTotal')).toContainText('₩0');
  });
  test('유료 모델 선택 시 라벨 전환', async ({ page }) => {
    await page.selectOption('#modelSelect', 'paid-demo');
    await expect(page.locator('#modelTopStatus')).toContainText('유료');
    await expect(page.locator('#usageTest')).toHaveText('샘플 유료 질문 1회 반영');
  });
  test('예산 100원: 0→40 허용, 80+40 차단(누적 불변), 100% 이후 버튼 비활성', async ({ page }) => {
    await page.selectOption('#modelSelect', 'paid-demo');
    await setBudget(page, '100');
    await page.click('#usageTest');
    await expect(page.locator('#usageTotal')).toContainText('₩40');
    await page.click('#usageTest');
    await expect(page.locator('#usageTotal')).toContainText('₩80');
    await expect(page.locator('#usageBudgetLabel')).toContainText('80% 사용');
    await expect(page.locator('#usageAlert')).toBeVisible();
    await page.click('#usageTest');
    await expect(page.locator('#toast')).toContainText('차단');
    await expect(page.locator('#usageTotal')).toContainText('₩80');
  });
  test('유료 100% 도달 시 요청 버튼 비활성 + 차단 안내', async ({ page }) => {
    await page.addInitScript(() => {
      const m = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 7);
      localStorage.setItem('archilaw_demo_budget_v2', '100');
      localStorage.setItem('archilaw_demo_usage_v2', JSON.stringify({ month: m, won: 100, allTokens: 0, input: 0, output: 0, lastCost: 0 }));
      localStorage.setItem('archilaw_demo_ai_model_v2', 'paid-demo');
    });
    await page.reload();
    await expect(page.locator('#usageBudgetLabel')).toContainText('100% 사용');
    await expect(page.locator('#usageTest')).toBeDisabled();
    await expect(page.locator('#usageAlertText')).toContainText('100%');
    // 무료 모델로 바꾸면 샘플 요청은 다시 가능
    await page.selectOption('#modelSelect', 'gemini-free');
    await expect(page.locator('#usageTest')).toBeEnabled();
  });
  test('저장된 예산은 첫 화면부터 표시된다 (기본값 깜빡임 없음)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('archilaw_demo_budget_v2', '3000'));
    await page.goto('/');
    await expect(page.locator('#usageBudgetLabel')).toContainText('3,000원');
    // 첫 DOM에 나타난 값이 곧바로 3,000원이어야 한다
    const first = await page.evaluate(() => document.querySelector('#usageBudgetLabel')?.textContent ?? '');
    expect(first).toContain('3,000원');
  });
  test('범위 밖 예산은 거부하고 안내', async ({ page }) => {
    await setBudget(page, '50');
    await expect(page.locator('#toast')).toContainText('100~1,000,000');
    await expect(page.locator('#budgetAmount')).toHaveValue('10000');
  });
  test('예산·모델 선택은 새로고침 후에도 유지', async ({ page }) => {
    await page.selectOption('#modelSelect', 'paid-demo');
    await setBudget(page, '300');
    await page.reload();
    await expect(page.locator('#budgetAmount')).toHaveValue('300');
    await expect(page.locator('#modelSelect')).toHaveValue('paid-demo');
  });
});

test.describe('저장소 접근 실패', () => {
  test('localStorage가 막혀 있어도 앱이 동작한다', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
    });
    await page.goto('/');
    await expect(page.locator('#answerTitle')).toBeVisible();
    await page.click('.chip:text-is("용적률")');
    await expect(page.locator('#answerTitle')).toContainText('용적률');
    await page.click('#bookmarkBtn');
    await page.click('#usageTest');
    expect(errs).toEqual([]);
    errors.length = 0; // 이 테스트의 의도된 SecurityError 로그는 콘솔 오류 검사에서 제외
  });
});
