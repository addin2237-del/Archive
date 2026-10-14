export interface ServerConfig {
  /** 법제처 OC 인증값. 없으면 null — 실연동 불가 상태이며 가짜 응답으로 대체하지 않는다. */
  lawOc: string | null;
  lawBaseUrl: string;
  host: string;
  port: number;
  upstreamTimeoutMs: number;
  upstreamMaxRetries: number;
  cacheTtl: { bodyMs: number; searchMs: number };
}

export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const oc = env.LAW_OC?.trim();
  return {
    lawOc: oc ? oc : null,
    lawBaseUrl: env.LAW_BASE_URL?.trim() || 'https://www.law.go.kr/DRF',
    host: env.HOST?.trim() || '127.0.0.1', // 기본은 로컬 전용. 외부 공개 시 인증 구조가 먼저 필요하다.
    port: Number(env.PORT) || 8787,
    upstreamTimeoutMs: Number(env.LAW_TIMEOUT_MS) || 10_000,
    upstreamMaxRetries: env.LAW_MAX_RETRIES !== undefined ? Number(env.LAW_MAX_RETRIES) : 2,
    cacheTtl: { bodyMs: 24 * 60 * 60 * 1000, searchMs: 60 * 60 * 1000 },
  };
}
