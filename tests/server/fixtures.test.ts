import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadFixture, syntheticFiles, SYNTHETIC_DIR } from './fixtures';

describe('합성 테스트 데이터 표시', () => {
  it('synthetic 폴더의 모든 파일이 합성·미검증으로 표시되어 있다', () => {
    const files = syntheticFiles();
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const meta = loadFixture(f.replace(/\.json$/, ''))._meta;
      expect(meta.synthetic, f).toBe(true);
      expect(meta.verifiedAgainstLiveApi, f).toBe(false);
    }
  });
  it('식별자는 SYN- 접두어, 조문 본문은 합성 표시 — 실제 법령과 혼동되지 않는다', () => {
    for (const f of syntheticFiles()) {
      const raw = fs.readFileSync(path.join(SYNTHETIC_DIR, f), 'utf-8');
      for (const m of raw.matchAll(/"법령(?:ID|일련번호)":\s*"([^"]+)"/g)) expect(m[1], f).toMatch(/^SYN-/);
      for (const m of raw.matchAll(/"조문내용":\s*"([^"]+)"/g)) expect(m[1], f).toMatch(/합성/);
    }
  });
  it('실제 응답 보관 폴더(raw)에는 합성 데이터가 섞이지 않는다', () => {
    const raw = path.resolve('tests/fixtures/law/raw');
    if (!fs.existsSync(raw)) return; // 아직 실연동 전
    for (const f of fs.readdirSync(raw)) expect(fs.readFileSync(path.join(raw, f), 'utf-8')).not.toContain('"synthetic"');
  });
});
