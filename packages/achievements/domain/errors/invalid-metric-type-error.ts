import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class InvalidMetricTypeError extends DomainError {
  constructor(value: string) {
    super(
      `Invalid metric type: "${value}" is not a recognized MetricType`,
      AchievementErrorCodes.INVALID_METRIC_TYPE as ErrorCode,
    );
  }
}
