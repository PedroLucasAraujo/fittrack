import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class GoalNotApprovedError extends DomainError {
  constructor() {
    super(
      'Goal must be approved before it can be started.',
      GoalsErrorCodes.GOAL_NOT_APPROVED as ErrorCode,
    );
  }
}
