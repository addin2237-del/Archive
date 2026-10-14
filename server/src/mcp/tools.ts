/**
 * MCP 어댑터 경계 (서비스 → MCP 방향). 우리 `/v1/legal/*` 서비스를 MCP 도구로 노출한다.
 * MCP SDK에 의존하지 않는 순수 도구 정의이며, 실제 MCP 서버(stdio/HTTP)는 이 목록을 SDK에 등록하는 얇은 껍데기로 붙인다 (후속).
 *
 * 반대 방향(외부 법령 MCP를 원천으로 사용)은 `LawSourceAdapter`를 구현하는 어댑터로 붙인다.
 * 그 경우에도 외부 호스팅 MCP에는 질의와 인증값을 보내지 않으며, 정규화·검증은 서비스 계층이 동일하게 수행한다.
 */
import type { ApiResult } from '../../../src/types';
import { issueContext } from '../context';
import { LegalError } from '../errors';
import { parseArticlesRequest, parseLawId, parseSearchRequest } from '../legal/validate';
import type { LegalService } from '../legal/service';

export interface McpToolResult { isError: boolean; content: { type: 'text'; text: string }[] }
export interface McpToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  call(args: unknown): Promise<McpToolResult>;
}

export function createLegalMcpTools(service: LegalService): McpToolSpec[] {
  const run = (fn: () => Promise<unknown>) => async (): Promise<McpToolResult> => {
    const ctx = issueContext('mcp');
    let result: ApiResult<unknown>;
    try { result = { status: 'ok', requestId: ctx.requestId, data: await fn() }; }
    catch (e) {
      const err = e instanceof LegalError ? e : new LegalError('INTERNAL_ERROR', '내부 오류가 발생했습니다');
      result = { status: 'error', requestId: ctx.requestId, error: err.toApiError() };
    }
    return { isError: result.status === 'error', content: [{ type: 'text', text: JSON.stringify(result) }] };
  };
  const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: '기준일 YYYY-MM-DD (기본: 오늘, Asia/Seoul)' };
  return [
    { name: 'legal_search', description: '건축법령 후보를 검색한다 (기준일 시행 버전과 시행 예정 버전 구분). 원문 검색만 수행하며 AI 호출 없음.',
      inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string', minLength: 1, maxLength: 100 }, sourceTypes: { type: 'array', items: { enum: ['법률', '시행령', '시행규칙', '조례', '해석례', '참고자료'] } }, asOf: date } },
      call: (a) => run(async () => service.search(parseSearchRequest(a)))() },
    { name: 'legal_get_articles', description: '법령ID와 조문번호(가지번호)로 기준일 시행 버전의 조문 원문을 조회한다.',
      inputSchema: { type: 'object', required: ['lawId', 'articles'], properties: { lawId: { type: 'string' }, articles: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'object', required: ['articleNo'], properties: { articleNo: { type: 'integer', minimum: 1 }, branchNo: { type: ['integer', 'null'], minimum: 1 } } } }, asOf: date } },
      call: (a) => run(async () => service.articles(parseArticlesRequest(a)))() },
    { name: 'legal_list_versions', description: '법령ID의 시행일별 버전 목록(연혁)을 조회한다.',
      inputSchema: { type: 'object', required: ['lawId'], properties: { lawId: { type: 'string' } } },
      call: (a) => run(async () => service.versions(parseLawId((a as { lawId?: unknown } | null)?.lawId)))() },
  ];
}
