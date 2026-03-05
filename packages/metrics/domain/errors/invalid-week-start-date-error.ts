import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { MetricErrorCodes } from './metric-error-codes.js';

/**
 * Raised when a weekStartDate is not a Monday or is otherwise invalid (ADR-0054 §2).
 */
export class InvalidWeekStartDateError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(reason, MetricErrorCodes.INVALID_WEEK_START_DATE as ErrorCode, context);
  }
}
