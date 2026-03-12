import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class GoalAlreadyStartedError extends DomainError {
  constructor() {
    super('Goal has already been started.', GoalsErrorCodes.GOAL_ALREADY_STARTED as ErrorCode);
  }
}
