import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { MetricErrorCodes } from './metric-error-codes.js';

/**
 * Raised when metric computation fails due to invalid input or business rule violation.
 * Used by ComputeWeeklyVolumeMetric and ComputeStreakMetric use cases.
 */
export class MetricComputationError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super(reason, MetricErrorCodes.COMPUTATION_FAILED as ErrorCode, context);
  }
}
