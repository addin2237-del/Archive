import { describe, expect, it } from 'vitest';
import { createApp } from '../../server/src/http/app';
import { issueContext } from '../../server/src/context';
import { UnconfiguredAdapter } from '../../server/src/legal/lawgokr/adapter';
import { LegalService } from '../../server/src/legal/service';
import type { LawSourceAdapter } from '../../server/src/legal/source';
import { parseSearchRequest } from '../../server/src/legal/validate';
import { makeAdapter, TEST_OC } from './helpers';

const live = () => createApp({ service: new LegalService(makeAdapter().adapter, undefined, () => new Date('2026-10-14T03:00:00Z')), ocConfigured: true });
const noOc = () => createApp({ service: new LegalService(new UnconfiguredAdapter()), ocConfigured: false });
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('/v1 공통 응답 규약', () => {
  it('성공 응답은 status ok + requestId이며 헤더와 일치한다', async () => {
    const res = await post(live(), '/v1/legal/search', { query: '건축법', asOf: '2023-01-01' });
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.status).toBe('ok');
    expect(res.headers.get('x-request-id')).toBe(j.requestId);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(j.data.candidates.length).toBeGreaterThan(0);
  });
  it('오류 응답은 구조화되어 있고 HTTP 상태가 코드에 대응한다', async () => {
    const res = await post(live(), '/v1/legal/search', { query: '' });
    const j = await res.json();
    expect(res.status).toBe(400);
    expect(j).toMatchObject({ status: 'error', error: { code: 'INVALID_REQUEST', retryable: false } });
    expect(typeof j.requestId).toBe('string');
  });
  it.each([['not json{'], ['[]'], ['null'], ['"str"']])('잘못된 본문 %s → 400', async (body) => {
    expect((await post(live(), '/v1/legal/search', body)).status).toBe(400);
  });
  it('너무 큰 본문은 거부', async () => {
    expect((await post(live(), '/v1/legal/search', { query: 'a', pad: 'x'.repeat(20_000) })).status).toBe(400);
  });
  it('존재하지 않는 날짜(2026-02-31)·형식 오류 asOf는 400', async () => {
    for (const asOf of ['2026-02-31', '20260101', 'today']) expect((await post(live(), '/v1/legal/search', { query: '건축법', asOf })).status).toBe(400);
  });
  it('알 수 없는 경로는 구조화된 404', async () => {
    const res = await live().request('/v1/nope');
    expect(res.status).toBe(404);
    expect((await res.json()).status).toBe('error');
  });
});

describe('인증값(OC)이 없을 때', () => {
  it('health는 설정 상태만 알리고 실연동 불가를 드러낸다', async () => {
    const j = await (await noOc().request('/v1/health')).json();
    expect(j.data.upstream).toMatchObject({ ocConfigured: false, contractStatus: 'unconfigured', reachable: 'unknown' });
  });
  it('검색·조문·버전 조회는 가짜 데이터 없이 LAW_OC_INVALID(503)', async () => {
    const app = noOc();
    for (const res of [await post(app, '/v1/legal/search', { query: '건축법' }), await post(app, '/v1/legal/articles', { lawId: 'SYN-L1', articles: [{ articleNo: 1 }] }), await app.request('/v1/legal/versions?lawId=SYN-L1')]) {
      const j = await res.json();
      expect(res.status).toBe(503);
      expect(j.error.code).toBe('LAW_OC_INVALID');
      expect(j.data).toBeUndefined();
    }
  });
});

describe('요청 검증', () => {
  it('articles: lawId 형식, 조 번호 범위, 개수 제한', async () => {
    const app = live();
    const bad = [
      { lawId: '../etc', articles: [{ articleNo: 1 }] },
      { lawId: 'SYN-L1', articles: [] },
      { lawId: 'SYN-L1', articles: [{ articleNo: 0 }] },
      { lawId: 'SYN-L1', articles: [{ articleNo: 1.5 }] },
      { lawId: 'SYN-L1', articles: [{ articleNo: 1, branchNo: 0 }] },
      { lawId: 'SYN-L1', articles: Array.from({ length: 21 }, () => ({ articleNo: 1 })) },
    ];
    for (const b of bad) expect((await post(app, '/v1/legal/articles', b)).status).toBe(400);
  });
  it('query의 제어 문자·길이 초과 거부, sourceTypes는 허용 값만', async () => {
    const app = live();
    for (const b of [{ query: 'a\u0000b' }, { query: 'a'.repeat(101) }, { query: '건축법', sourceTypes: ['임의'] }, { query: 1 }]) expect((await post(app, '/v1/legal/search', b)).status).toBe(400);
  });
  it('versions: lawId 쿼리 필수', async () => {
    expect((await live().request('/v1/legal/versions')).status).toBe(400);
  });
});

describe('신원은 서버가 정한다', () => {
  it('요청 본문의 userId/organizationId는 파싱 결과에 포함되지 않는다', () => {
    const r = parseSearchRequest({ query: '건축법', userId: 'attacker', organizationId: 'other-org' });
    expect(Object.keys(r)).not.toContain('userId');
    expect(Object.keys(r)).not.toContain('organizationId');
  });
  it('요청 콘텍스트는 항상 local-owner/personal이며 클라이언트 입력이 없다', () => {
    const ctx = issueContext('test');
    expect(ctx).toMatchObject({ userId: 'local-owner', organizationId: 'personal', clientApp: 'test' });
    expect(issueContext('test').requestId).not.toBe(ctx.requestId);
  });
  it('위조 헤더(x-user-id 등)가 있어도 요청은 동일하게 처리된다', async () => {
    const res = await post(live(), '/v1/legal/search', { query: '건축법', asOf: '2023-01-01' }, { 'x-user-id': 'attacker', 'x-organization-id': 'x' });
    expect(res.status).toBe(200);
  });
});

describe('오류 매핑과 정보 노출', () => {
  const failing = (e: Error): LawSourceAdapter => ({ name: 't', contractStatus: 'synthetic', searchVersions: async () => { throw e; }, listVersions: async () => { throw e; }, getBody: async () => { throw e; } });
  it('예상 못한 내부 예외는 INTERNAL_ERROR(500)이며 메시지를 노출하지 않는다', async () => {
    const app = createApp({ service: new LegalService(failing(new Error('db password=hunter2 stack...'))), ocConfigured: true });
    const res = await post(app, '/v1/legal/search', { query: '건축법' });
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).toContain('INTERNAL_ERROR');
    expect(text).not.toContain('hunter2');
  });
  it('응답 어디에도 OC 값이 나오지 않는다', async () => {
    const app = live();
    for (const res of [await post(app, '/v1/legal/search', { query: '건축법' }), await app.request('/v1/health'), await post(app, '/v1/legal/search', { query: '' })]) {
      expect(await res.text()).not.toContain(TEST_OC);
    }
  });
});
