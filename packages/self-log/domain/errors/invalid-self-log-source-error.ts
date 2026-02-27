import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SelfLogErrorCodes } from './self-log-error-codes.js';

/**
 * Raised when an `EntrySource` invariant is violated.
 *
 * Examples:
 * - `sourceType = EXECUTION` supplied with a null or non-UUIDv4 `sourceId`
 *
 * Distinct from `InvalidSelfLogEntryError` (SELF_LOG.INVALID_ENTRY), which
 * covers entry-level invariants (value, unit, correctedEntryId).
 * This class covers source-level invariants exclusively.
 */
export class InvalidSelfLogSourceError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(reason, SelfLogErrorCodes.INVALID_SOURCE as ErrorCode, context);
  }
}
