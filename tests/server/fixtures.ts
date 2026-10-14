import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('tests/fixtures/law/synthetic');
export interface Fixture { _meta: { synthetic: boolean; verifiedAgainstLiveApi: boolean }; body?: unknown; text?: string }
export const loadFixture = (name: string): Fixture => JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf-8'));
/** fetch 응답 본문 문자열 (JSON 본문 또는 원문 텍스트) */
export const fixtureText = (name: string): string => { const f = loadFixture(name); return f.text ?? JSON.stringify(f.body); };
export const fixtureBody = (name: string): unknown => loadFixture(name).body;
export const syntheticFiles = (): string[] => fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
export { DIR as SYNTHETIC_DIR };
