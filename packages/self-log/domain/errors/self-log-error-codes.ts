/**
 * Error code registry for the SelfLog bounded context.
 *
 * Namespaced with `SELF_LOG.` prefix to prevent collisions with core
 * ErrorCodes and codes from other bounded contexts (ADR-0012).
 */
export const SelfLogErrorCodes = {
  INVALID_ENTRY: 'SELF_LOG.INVALID_ENTRY',
  ALREADY_ANONYMIZED: 'SELF_LOG.ALREADY_ANONYMIZED',
  INVALID_SOURCE: 'SELF_LOG.INVALID_SOURCE',
  ENTRY_NOT_FOUND: 'SELF_LOG.ENTRY_NOT_FOUND',
} as const;

export type SelfLogErrorCode = (typeof SelfLogErrorCodes)[keyof typeof SelfLogErrorCodes];
