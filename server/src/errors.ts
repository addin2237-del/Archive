import type { ApiError } from '../../src/types';
import { LEGAL_ERROR_RETRYABLE, type LegalErrorCode } from '../../src/types/legal';

/** 서비스 내부 오류. 메시지에는 URL·OC 등 비밀값을 넣지 않는다. */
export class LegalError extends Error {
  constructor(readonly code: LegalErrorCode, message: string, readonly detail?: Record<string, unknown>) {
    super(message);
    this.name = 'LegalError';
  }
  toApiError(): ApiError {
    return { code: this.code, message: this.message, retryable: LEGAL_ERROR_RETRYABLE[this.code] };
  }
}

export const HTTP_STATUS: Record<LegalErrorCode, number> = {
  INVALID_REQUEST: 400,
  INTERNAL_ERROR: 500,
  LAW_NOT_FOUND: 404,
  LAW_VERSION_AMBIGUOUS: 409,
  LAW_RATE_LIMITED: 429,
  LAW_OC_INVALID: 503,
  LAW_UPSTREAM_FORBIDDEN: 502,
  LAW_UPSTREAM_BAD_RESPONSE: 502,
  LAW_UPSTREAM_UNAVAILABLE: 502,
  LAW_UPSTREAM_TIMEOUT: 504,
};

/** 문자열에서 비밀값을 가린다. */
export const redact = (text: string, secrets: (string | null | undefined)[]): string =>
  secrets.reduce<string>((t, s) => (s ? t.split(s).join('***') : t), text);
