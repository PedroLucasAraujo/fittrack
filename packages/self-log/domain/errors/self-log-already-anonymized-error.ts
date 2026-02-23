import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SelfLogErrorCodes } from './self-log-error-codes.js';

/**
 * Raised when `SelfLogEntry.anonymize()` is called on an entry that has already
 * been anonymized (ADR-0037 §5 — LGPD erasure is idempotent at the domain level).
 *
 * Prevents double-erasure and guards the `deletedAtUtc` timestamp from being
 * overwritten with a later value.
 */
export class SelfLogAlreadyAnonymizedError extends DomainError {
  constructor() {
    super(
      'SelfLogEntry has already been anonymized',
      SelfLogErrorCodes.ALREADY_ANONYMIZED as ErrorCode,
    );
  }
}
