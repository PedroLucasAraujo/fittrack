import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class GoalNotActiveError extends DomainError {
  constructor() {
    super(
      'Goal must be active to perform this operation.',
      GoalsErrorCodes.GOAL_NOT_ACTIVE as ErrorCode,
    );
  }
}
