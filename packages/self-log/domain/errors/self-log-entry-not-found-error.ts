import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SelfLogErrorCodes } from './self-log-error-codes.js';

/**
 * Raised when a SelfLogEntry is not found by ID (or belongs to a different tenant).
 *
 * Cross-tenant access returns this error (404 semantics, ADR-0025 §4).
 * The error context intentionally omits tenant identifiers (ADR-0037 — no PII leakage).
 */
export class SelfLogEntryNotFoundError extends DomainError {
  constructor(id: string) {
    super(`SelfLogEntry not found: ${id}`, SelfLogErrorCodes.ENTRY_NOT_FOUND as ErrorCode, { id });
  }
}
