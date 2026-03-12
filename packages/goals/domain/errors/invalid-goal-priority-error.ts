import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidGoalPriorityError extends DomainError {
  constructor(received: string) {
    super(
      `Invalid goal priority: "${received}". Must be one of: HIGH, MEDIUM, LOW.`,
      GoalsErrorCodes.INVALID_GOAL_PRIORITY as ErrorCode,
    );
  }
}
