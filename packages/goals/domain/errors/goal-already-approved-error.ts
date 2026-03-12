import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class GoalAlreadyApprovedError extends DomainError {
  constructor() {
    super('Goal has already been approved.', GoalsErrorCodes.GOAL_ALREADY_APPROVED as ErrorCode);
  }
}
