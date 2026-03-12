import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidGoalCategoryError extends DomainError {
  constructor(received: string) {
    super(
      `Invalid goal category: "${received}". Must be one of: WEIGHT_LOSS, MUSCLE_GAIN, PERFORMANCE, HEALTH, HABIT, CONSISTENCY, NUTRITION.`,
      GoalsErrorCodes.INVALID_GOAL_CATEGORY as ErrorCode,
    );
  }
}
