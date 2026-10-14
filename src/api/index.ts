import type { ApiClients } from './clients';
import { MockAIProviderClient } from './mock/MockAIProviderClient';
import { MockLegalSearchClient } from './mock/MockLegalSearchClient';
import { MockUsageClient } from './mock/MockUsageClient';

// Phase 2~3에서 이 한 곳만 HTTP(/v1) 클라이언트로 교체한다.
export const clients: ApiClients = {
  legal: new MockLegalSearchClient(),
  ai: new MockAIProviderClient(),
  usage: new MockUsageClient(),
};

export type { ApiClients } from './clients';
