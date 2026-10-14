import { serve } from '@hono/node-server';
import { createApp } from './http/app';
import { loadConfig } from './config';
import { LawGoKrAdapter, UnconfiguredAdapter } from './legal/lawgokr/adapter';
import { LegalService } from './legal/service';

const config = loadConfig();
const adapter = config.lawOc ? new LawGoKrAdapter(config) : new UnconfiguredAdapter();
const app = createApp({ service: new LegalService(adapter, config.cacheTtl), ocConfigured: config.lawOc !== null });

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`legal service listening on http://${info.address}:${info.port}  upstream=${adapter.name} contract=${adapter.contractStatus}`);
  if (!config.lawOc) console.warn('LAW_OC가 설정되지 않았습니다. 법령 조회는 LAW_OC_INVALID 오류를 반환합니다.');
});
