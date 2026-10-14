import type { Page } from '@playwright/test';

/** 콘솔 오류/페이지 예외를 수집한다. */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function openApp(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => { try { localStorage.setItem('archilaw_theme', t); } catch { /* noop */ } }, theme);
  await page.goto('/');
  await page.locator('#answerTitle').waitFor();
}

export const text = (page: Page, sel: string) => page.locator(sel).first().innerText();
