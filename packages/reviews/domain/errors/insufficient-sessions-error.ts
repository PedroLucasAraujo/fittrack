import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';

/**
 * Raised when a client attempts to submit a review without having
 * at least 5 completed sessions with the professional (ADR-0068 §3).
 */
export class InsufficientSessionsError extends DomainError {
  constructor(sessionCount: number, required: number = 5) {
    super(
      `Insufficient sessions to submit a review: ${sessionCount} completed, ${required} required.`,
      ReviewErrorCodes.INSUFFICIENT_SESSIONS as unknown as ErrorCode,
      { sessionCount, required },
    );
  }
}
