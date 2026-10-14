import { LawGoKrAdapter } from '../../server/src/legal/lawgokr/adapter';
import { fixtureText } from './fixtures';

export const TEST_OC = 'test-oc-SECRET-123';
export interface Call { url: URL }
type Reply = { status?: number; text: string } | (() => Promise<{ status: number; text(): Promise<string> }>);

/** URL(엔드포인트·파라미터)로 응답을 고르는 가짜 fetch. 호출 기록을 남긴다. */
export function fakeFetch(route: (u: URL) => Reply) {
  const calls: Call[] = [];
  const fn = async (url: string, init: { signal: AbortSignal }) => {
    const u = new URL(url);
    calls.push({ url: u });
    const r = route(u);
    if (typeof r === 'function') return r();
    void init;
    return { status: r.status ?? 200, text: async () => r.text };
  };
  return { fn, calls };
}

/** 합성 데이터로 응답하는 라우터 (SYN-L1: 건축법 3개 버전, SYN-L2/L3: 시행령·시행규칙) */
export function syntheticRoute(u: URL): Reply {
  const ep = u.pathname.split('/').pop();
  if (ep === 'lawSearch.do') {
    if (u.searchParams.get('LID')) return { text: fixtureText('search-eflaw-multi') }; // LID 무시 시나리오: 다른 법령이 섞여 와도 어댑터가 걸러야 함
    return { text: fixtureText('search-eflaw-multi') };
  }
  if (ep === 'lawService.do') {
    const mst = u.searchParams.get('MST');
    if (mst === 'SYN-M2') return { text: fixtureText('body-law-m2') };
    if (mst === 'SYN-M1') return { text: fixtureText('body-law-m1') };
    return { status: 200, text: JSON.stringify({ 오류: 'unknown mst' }) };
  }
  return { status: 404, text: '' };
}

export const makeAdapter = (route: (u: URL) => Reply = syntheticRoute, over: Partial<ConstructorParameters<typeof LawGoKrAdapter>[0]> = {}) => {
  const f = fakeFetch(route);
  const sleeps: number[] = [];
  const adapter = new LawGoKrAdapter({ lawOc: TEST_OC, lawBaseUrl: 'https://upstream.test/DRF', upstreamTimeoutMs: 50, upstreamMaxRetries: 2, ...over }, f.fn, async (ms) => { sleeps.push(ms); });
  return { adapter, calls: f.calls, sleeps };
};
