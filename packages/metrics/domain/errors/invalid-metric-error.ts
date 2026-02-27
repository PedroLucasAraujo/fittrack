import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { MetricErrorCodes } from './metric-error-codes.js';

/**
 * Raised when a Metric aggregate invariant is violated during creation.
 *
 * Examples:
 * - sourceExecutionIds is empty
 * - An entry in sourceExecutionIds is not a valid UUIDv4
 * - value is negative or non-finite
 * - unit is empty or too long
 * - derivationRuleVersion is empty
 * - timezoneUsed is empty
 *
 * All Metric validation failures use this single error class, differentiated
 * by the `reason` message.
 */
export class InvalidMetricError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(reason, MetricErrorCodes.METRIC_INVALID as ErrorCode, context);
  }
}
