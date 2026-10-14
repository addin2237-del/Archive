import { expect, test, type Page } from '@playwright/test';
import { collectErrors, openApp } from './helpers';

const WIDTHS = [
  { name: 'PC', w: 1536, h: 1030 },
  { name: '노트북', w: 1240, h: 900 },
  { name: '태블릿', w: 1000, h: 800 },
  { name: '작은 태블릿', w: 760, h: 900 },
  { name: '모바일 400', w: 400, h: 844 },
  { name: '모바일 390', w: 390, h: 844 },
];
const THEMES = ['light', 'dark'] as const;

/** 같은 그룹 안에서 서로 겹치는 요소 쌍을 찾는다. (히어로와 검색 패널의 의도된 겹침은 그룹에 넣지 않는다.) */
async function findOverlaps(page: Page) {
  return page.evaluate(() => {
    const groups = ['.side-section > .surface-card', '.glossary-card', '.chip', '.usage-meta > div', '.sidebar .nav-item', '.tabs .tab',
      '.answer-tools button', '.top-actions > *', '.query-row > *', '.mini-inputs .field', '.usage-markers span'];
    const vis = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const out: string[] = [];
    for (const g of groups) {
      const els = [...document.querySelectorAll(g)].filter(vis);
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
        const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) out.push(`${g}: #${i} ↔ #${j} (${Math.round(w)}×${Math.round(h)}px)`);
      }
    }
    return out;
  });
}

/** 잘린 텍스트(scrollWidth > clientWidth)와 뷰포트 밖으로 나간 요소를 찾는다. */
async function findClipping(page: Page) {
  return page.evaluate(() => {
    const sel = 'button, .chip, .tab, .nav-label, .card-title, .usage-meta strong, .usage-meta span, .glossary-card strong, .glossary-card p, h1, h2, label, .model-status, .demo-pill, .breadcrumbs, .state, .notice span, .usage-limit, .calc-result, .source-item strong, .source-item small, .ratio-copy';
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.closest('.sr-only')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible') out.push(`잘림: ${el.tagName}.${el.className} "${(el.textContent ?? '').trim().slice(0, 24)}" (${el.scrollWidth}>${el.clientWidth})`);
    }
    for (const el of document.querySelectorAll<HTMLElement>('#root *')) {
      if (el.closest('svg, .toast, .sr-only')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > window.innerWidth + 1 || r.left < -1) out.push(`화면 밖: ${el.tagName}.${el.className} (left ${Math.round(r.left)}, right ${Math.round(r.right)})`);
    }
    return [...new Set(out)];
  });
}

for (const theme of THEMES) for (const vp of WIDTHS) {
  test.describe(`${vp.name} ${vp.w}px · ${theme}`, () => {
    test.use({ viewport: { width: vp.w, height: vp.h } });

    test('가로 스크롤·겹침·잘림·콘솔 오류 없음', async ({ page }) => {
      const errors = collectErrors(page);
      await openApp(page, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), '가로 스크롤').toBeLessThanOrEqual(vp.w);
      expect(await findOverlaps(page), '요소 겹침').toEqual([]);
      expect(await findClipping(page), '텍스트 잘림/화면 밖').toEqual([]);
      expect(errors, '콘솔 오류').toEqual([]);
    });

    test('주요 버튼이 동작한다', async ({ page }) => {
      const errors = collectErrors(page);
      await openApp(page, theme);
      await page.click('.chip:text-is("포치 · 데크")');
      await expect(page.locator('#answerTitle')).toContainText('포치와 데크는');
      await page.click('#tab-source');
      await expect(page.locator('#panel-source')).toBeVisible();
      await page.click('#bookmarkBtn');
      await expect(page.locator('#bookmarkBtn')).toHaveAttribute('aria-pressed', 'true');
      await page.fill('#questionInput', '다락 연면적 포함 여부');
      await page.click('#askBtn');
      await expect(page.locator('#answerTitle')).toContainText('다락은');
      await page.fill('#siteArea', '200');
      await expect(page.locator('#calcResult')).toContainText('80.0');
      await page.selectOption('#modelSelect', 'paid-demo');
      await page.click('#usageTest');
      await expect(page.locator('#usageTotal')).toContainText('₩40');
      const other = theme === 'light' ? 'dark' : 'light';
      await page.locator('.theme-toggle:visible').first().click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', other);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), '조작 후 가로 스크롤').toBeLessThanOrEqual(vp.w);
      expect(errors, '콘솔 오류').toEqual([]);
    });
  });
}
