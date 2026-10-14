import { randomUUID } from 'node:crypto';
import type { RequestContext } from '../../src/types';

/**
 * 요청 콘텍스트는 서버가 부여한다. 클라이언트가 보낸 userId/organizationId/헤더는 신뢰하지 않는다.
 * 개인용 단계: userId=local-owner, organizationId=personal. 팀 확장 시 인증된 주체에서 채운다.
 */
export function issueContext(clientApp: string, now: Date = new Date()): RequestContext {
  return {
    requestId: randomUUID(),
    userId: 'local-owner',
    organizationId: 'personal',
    clientApp,
    requestedAt: now.toISOString(),
    policyId: 'personal-default',
  };
}
