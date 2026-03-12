import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class GoalAlreadyCompletedError extends DomainError {
  constructor() {
    super('Goal has already been completed.', GoalsErrorCodes.GOAL_ALREADY_COMPLETED as ErrorCode);
  }
}
