#!/usr/bin/env node
/**
 * 법제처 DRF API 연결 점검 + 원본 응답 보관 (Phase 2 준비용).
 *
 *   LAW_OC=<인증값> node scripts/probe-law-api.mjs
 *
 * - 응답 해석은 하지 않는다. 상태·형식·최상위 키만 기록하고 원본을 저장한다. (필드 매핑은 보관된 원본을 보고 확정)
 * - OC 값은 저장 파일·출력에서 마스킹한다.
 * - 프록시/CA 설정을 따르도록 curl을 사용한다.
 */
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BASE = 'https://www.law.go.kr/DRF';
const OUT = new URL('../tests/fixtures/law/', import.meta.url).pathname;
const OC = process.env.LAW_OC;

if (!OC) {
  console.error('LAW_OC 환경변수가 없습니다. docs/phase2/03-setup-guide.md 를 참고하세요.');
  process.exit(2);
}

const mask = (s) => s.split(OC).join('***');
const ERROR_HINTS = ['사용자 정보 검증에 실패', '미신청', '접근', 'error', 'Error', '오류', 'IP', '도메인'];

async function call(name, endpoint, params) {
  const url = `${BASE}/${endpoint}?${new URLSearchParams({ OC, type: 'JSON', ...params })}`;
  const t0 = Date.now();
  const rec = { name, endpoint, params, ms: 0 };
  try {
    const { stdout } = await run('curl', ['-sS', '-m', '30', '-w', '\n__STATUS__%{http_code} __CT__%{content_type}', url], { maxBuffer: 20 * 1024 * 1024 });
    const i = stdout.lastIndexOf('\n__STATUS__');
    const body = stdout.slice(0, i);
    const [, status, ct] = /__STATUS__(\d+) __CT__(.*)$/.exec(stdout.slice(i + 1)) ?? [];
    Object.assign(rec, { httpStatus: Number(status), contentType: ct, bytes: Buffer.byteLength(body) });
    let json = null;
    try { json = JSON.parse(body); } catch { /* not JSON */ }
    rec.isJson = json !== null;
    if (json && typeof json === 'object') rec.topLevelKeys = Object.keys(json);
    rec.errorHints = ERROR_HINTS.filter((h) => body.includes(h)); // HTTP 200이어도 본문이 오류일 수 있어 따로 기록
    rec.bodyHead = mask(body.slice(0, 300));
    await mkdir(`${OUT}raw`, { recursive: true });
    await writeFile(`${OUT}raw/${name}.${json ? 'json' : 'txt'}`, mask(body));
    rec.saved = true;
    rec.json = json;
  } catch (e) {
    rec.error = mask(String(e.stderr || e.message)).slice(0, 300);
  }
  rec.ms = Date.now() - t0;
  return rec;
}

// 응답 구조를 가정하지 않고, 알려진 키 이름을 재귀적으로 찾는다. 없으면 null (→ 리포트에 '미발견'으로 남음)
function findKey(node, key) {
  if (node && typeof node === 'object') {
    if (key in node) return node[key];
    for (const v of Object.values(node)) { const r = findKey(v, key); if (r !== undefined) return r; }
  }
  return undefined;
}

const report = { probedAt: new Date().toISOString(), steps: [], notes: [] };
const push = (r) => { const { json, ...rest } = r; report.steps.push(rest); console.log(`${r.error ? 'ERR' : r.httpStatus}  ${r.name}  ${r.error ?? `${r.contentType} ${r.bytes}B json=${r.isJson} hints=[${r.errorHints}]`}`); return r; };

// 0) 오류 형태 기록: 잘못된 OC가 HTTP 200으로 오는지 (LAW_UPSTREAM_BAD_RESPONSE 설계 근거)
{
  const bad = `${BASE}/lawSearch.do?${new URLSearchParams({ OC: 'invalid-oc-probe', target: 'eflaw', type: 'JSON', query: '건축법' })}`;
  try {
    const { stdout } = await run('curl', ['-sS', '-m', '30', '-w', '\n__STATUS__%{http_code}', bad]);
    const i = stdout.lastIndexOf('\n__STATUS__');
    const rec = { name: 'invalid-oc', httpStatus: Number(stdout.slice(i + 10)), bodyHead: stdout.slice(0, i).slice(0, 300) };
    report.steps.push(rec);
    console.log(`${rec.httpStatus}  invalid-oc  ${rec.bodyHead.replace(/\s+/g, ' ').slice(0, 120)}`);
  } catch (e) { report.steps.push({ name: 'invalid-oc', error: String(e.stderr || e.message).slice(0, 300) }); console.log('ERR invalid-oc', String(e.stderr || e.message).slice(0, 200)); }
}

// 1) 법령 3종 검색 (시행일 기준 eflaw)
const found = {};
for (const [key, query] of [['law', '건축법'], ['decree', '건축법 시행령'], ['rule', '건축법 시행규칙']]) {
  const r = push(await call(`search-eflaw-${key}`, 'lawSearch.do', { target: 'eflaw', query }));
  if (r.json) found[key] = { lawId: findKey(r.json, '법령ID'), mst: findKey(r.json, '법령일련번호'), efYd: findKey(r.json, '시행일자') };
}
report.discovered = found;

// 2) 본문 조회: 찾은 식별자로 한 번씩 (식별자 종류별 동작 차이를 기록)
for (const [key, f] of Object.entries(found)) {
  if (f.mst) push(await call(`service-eflaw-${key}-by-mst`, 'lawService.do', { target: 'eflaw', MST: String(f.mst) }));
  else report.notes.push(`${key}: 검색 응답에서 '법령일련번호' 키를 찾지 못함 — raw/search-eflaw-${key} 확인`);
  if (f.lawId && f.efYd) push(await call(`service-eflaw-${key}-by-id-efyd`, 'lawService.do', { target: 'eflaw', ID: String(f.lawId), efYd: String(f.efYd) }));
}
// 2-1) 법령ID 필터(LID) 파라미터가 실제로 동작하는지 (설계상 가정)
if (found.law?.lawId) push(await call('search-eflaw-law-by-lid', 'lawSearch.do', { target: 'eflaw', LID: String(found.law.lawId), display: '100' }));
// 3) 일반 법령(공포일 기준) 검색과 비교
push(await call('search-law-law', 'lawSearch.do', { target: 'law', query: '건축법' }));

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}probe-report.json`, mask(JSON.stringify(report, null, 2)));
const failed = report.steps.filter((s) => s.error || s.httpStatus >= 400 || s.errorHints?.length);
console.log(`\n단계 ${report.steps.length}개, 이상 징후 ${failed.length}개 → tests/fixtures/law/probe-report.json`);
process.exit(failed.length ? 1 : 0);
