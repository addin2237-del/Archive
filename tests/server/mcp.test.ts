import { describe, expect, it } from 'vitest';
import { UnconfiguredAdapter } from '../../server/src/legal/lawgokr/adapter';
import { LegalService } from '../../server/src/legal/service';
import { createLegalMcpTools } from '../../server/src/mcp/tools';
import { makeAdapter } from './helpers';

const tools = (svc = new LegalService(makeAdapter().adapter, undefined, () => new Date('2026-10-14T03:00:00Z'))) => Object.fromEntries(createLegalMcpTools(svc).map((t) => [t.name, t]));
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

describe('MCP 어댑터 경계 (서비스 → MCP)', () => {
  it('도구 3개와 입력 스키마를 노출한다', () => {
    const t = tools();
    expect(Object.keys(t).sort()).toEqual(['legal_get_articles', 'legal_list_versions', 'legal_search']);
    expect(t.legal_search.inputSchema.required).toEqual(['query']);
    expect(t.legal_get_articles.inputSchema.required).toEqual(['lawId', 'articles']);
  });
  it('legal_search는 /v1과 같은 ApiResult를 JSON 텍스트로 돌려준다', async () => {
    const r = await tools().legal_search.call({ query: '건축법', asOf: '2023-01-01' });
    expect(r.isError).toBe(false);
    expect(parse(r)).toMatchObject({ status: 'ok' });
  });
  it('조문 조회와 연혁 조회', async () => {
    const t = tools();
    const a = parse(await t.legal_get_articles.call({ lawId: 'SYN-L1', articles: [{ articleNo: 1 }], asOf: '2023-01-01' }));
    expect(a.data.version.mst).toBe('SYN-M2');
    const v = parse(await t.legal_list_versions.call({ lawId: 'SYN-L1' }));
    expect(v.data.versions).toHaveLength(3);
  });
  it('잘못된 인자는 isError + INVALID_REQUEST', async () => {
    const r = await tools().legal_search.call({ query: '' });
    expect(r.isError).toBe(true);
    expect(parse(r).error.code).toBe('INVALID_REQUEST');
    expect((await tools().legal_list_versions.call(null)).isError).toBe(true);
  });
  it('인증값이 없으면 isError + LAW_OC_INVALID (가짜 결과 없음)', async () => {
    const r = await tools(new LegalService(new UnconfiguredAdapter())).legal_search.call({ query: '건축법' });
    expect(r.isError).toBe(true);
    expect(parse(r).error.code).toBe('LAW_OC_INVALID');
  });
});
