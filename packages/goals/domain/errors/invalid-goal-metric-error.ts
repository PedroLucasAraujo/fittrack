import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidGoalMetricError extends DomainError {
  constructor(received: string) {
    super(
      `Invalid goal metric: "${received}". Must be one of: WEIGHT, BODY_FAT, STRENGTH, ENDURANCE, STREAK_DAYS, WEEKLY_VOLUME, DAILY_PROTEIN, DAILY_WATER.`,
      GoalsErrorCodes.INVALID_GOAL_METRIC as ErrorCode,
    );
  }
}
