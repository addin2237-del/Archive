import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { openApp } from './helpers';

// 디자인 원본(reference/*.html)과 React 구현을 같은 뷰포트에서 캡처해 픽셀 단위로 비교한다.
// 폰트 렌더링 등 환경 차이는 허용 비율 안에서 통과시키고, 차이 위치를 리포트에 남긴다.
const ORIGINAL = 'file://' + path.resolve('reference/archilaw-apple-budget-ui.html');
const MAX_DIFF_RATIO = 0.0005; // 0.05%
const OUT = 'test-results/visual';

const SIZES = [[1536, 1030], [1240, 900], [1000, 800], [760, 900], [400, 844], [390, 844]] as const;

/** 차이 픽셀을 행 단위로 묶어 대략적인 영역(y 범위, x 범위)으로 요약한다. */
function clusters(diff: PNG, ratio = 24) {
  const rows = new Map<number, { x0: number; x1: number; n: number }>();
  for (let y = 0; y < diff.height; y++) for (let x = 0; x < diff.width; x++) {
    const i = (y * diff.width + x) * 4;
    if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) {
      const k = Math.floor(y / ratio), c = rows.get(k) ?? { x0: x, x1: x, n: 0 };
      c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.n++; rows.set(k, c);
    }
  }
  return [...rows.entries()].map(([k, c]) => `y≈${k * ratio}-${k * ratio + ratio} x=${c.x0}-${c.x1} (${c.n}px)`);
}

for (const theme of ['light', 'dark'] as const) for (const [w, h] of SIZES) {
  test(`원본과 시각 일치 · ${w}px · ${theme}`, async ({ browser }, info) => {
    const shot = async (url: string, react: boolean) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
      const page = await ctx.newPage();
      if (react) await openApp(page, theme);
      else { await page.addInitScript((t) => localStorage.setItem('archilaw_theme', t), theme); await page.goto(url); await page.waitForTimeout(300); }
      const buf = await page.screenshot({ fullPage: true });
      await ctx.close();
      return PNG.sync.read(buf);
    };
    const a = await shot(ORIGINAL, false), b = await shot('/', true);
    expect({ w: b.width, h: b.height }, '페이지 크기').toEqual({ w: a.width, h: a.height });
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
    const ratio = n / (a.width * a.height);
    fs.mkdirSync(OUT, { recursive: true });
    const name = `${w}-${theme}`;
    fs.writeFileSync(`${OUT}/${name}-diff.png`, PNG.sync.write(diff));
    const where = clusters(diff);
    fs.writeFileSync(`${OUT}/${name}.txt`, `diff ${n}px (${(ratio * 100).toFixed(4)}%)\n${where.join('\n')}\n`);
    info.annotations.push({ type: 'diff', description: `${n}px (${(ratio * 100).toFixed(4)}%) ${where.slice(0, 3).join(' | ')}` });
    expect(ratio).toBeLessThanOrEqual(MAX_DIFF_RATIO);
  });
}
