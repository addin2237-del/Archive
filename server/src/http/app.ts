import { Hono } from 'hono';
import type { ApiResult } from '../../../src/types';
import { issueContext } from '../context';
import { HTTP_STATUS, LegalError } from '../errors';
import { parseArticlesRequest, parseLawId, parseSearchRequest } from '../legal/validate';
import type { LegalService } from '../legal/service';

export interface AppOptions { service: LegalService; ocConfigured: boolean; clientApp?: string }
const MAX_BODY = 16 * 1024;
type StatusCode = 200 | 400 | 404 | 409 | 429 | 500 | 502 | 503 | 504;

/**
 * `/v1` 공통 API. UI와 향후 팀 프로그램이 같은 계약을 쓴다.
 * - 모든 응답은 ApiResult (구조화된 오류, requestId)
 * - 요청 콘텍스트(userId/organizationId)는 서버가 부여하며 클라이언트 값(본문·헤더)은 무시한다
 */
export function createApp({ service, ocConfigured, clientApp = 'archilaw-personal-ui' }: AppOptions) {
  const app = new Hono();

  const respond = async <T>(c: import('hono').Context, fn: () => Promise<T>) => {
    const ctx = issueContext(clientApp);
    c.header('x-request-id', ctx.requestId);
    c.header('cache-control', 'no-store');
    try {
      const data = await fn();
      return c.json({ status: 'ok', requestId: ctx.requestId, data } satisfies ApiResult<T>, 200);
    } catch (e) {
      const err = e instanceof LegalError ? e : new LegalError('INTERNAL_ERROR', '내부 오류가 발생했습니다'); // 내부 예외 메시지는 노출하지 않는다
      return c.json({ status: 'error', requestId: ctx.requestId, error: err.toApiError() } satisfies ApiResult<never>, HTTP_STATUS[err.code] as StatusCode);
    }
  };

  const readJson = async (c: import('hono').Context): Promise<unknown> => {
    const text = await c.req.text();
    if (text.length > MAX_BODY) throw new LegalError('INVALID_REQUEST', '요청이 너무 큽니다');
    try { return JSON.parse(text); } catch { throw new LegalError('INVALID_REQUEST', '요청 본문이 올바른 JSON이 아닙니다'); }
  };

  app.post('/v1/legal/search', (c) => respond(c, async () => service.search(parseSearchRequest(await readJson(c)))));
  app.post('/v1/legal/articles', (c) => respond(c, async () => service.articles(parseArticlesRequest(await readJson(c)))));
  app.get('/v1/legal/versions', (c) => respond(c, async () => service.versions(parseLawId(c.req.query('lawId')))));
  app.get('/v1/health', (c) => respond(c, async () => ({
    service: 'ok' as const,
    // 호출은 하지 않는다. 인증값 유무와 계약 검증 상태만 알린다 (OC 값은 절대 노출하지 않음)
    upstream: { name: service.adapterInfo.name, ocConfigured, contractStatus: service.adapterInfo.contractStatus, reachable: 'unknown' as const },
  })));

  app.notFound((c) => c.json({ status: 'error', requestId: 'none', error: { code: 'INVALID_REQUEST', message: '존재하지 않는 경로입니다', retryable: false } } satisfies ApiResult<never>, 404));
  app.onError((_e, c) => c.json({ status: 'error', requestId: 'none', error: { code: 'INTERNAL_ERROR', message: '내부 오류가 발생했습니다', retryable: false } } satisfies ApiResult<never>, 500));
  return app;
}
