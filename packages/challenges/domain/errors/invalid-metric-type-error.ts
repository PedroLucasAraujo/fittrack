import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidMetricTypeError extends DomainError {
  constructor() {
    super(
      'Metric type must be WORKOUT_COUNT, TOTAL_VOLUME, STREAK_DAYS, or NUTRITION_LOG_COUNT.',
      ChallengeErrorCodes.INVALID_METRIC_TYPE as ErrorCode,
    );
  }
}
