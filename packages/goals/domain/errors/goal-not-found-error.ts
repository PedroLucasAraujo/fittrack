import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class GoalNotFoundError extends DomainError {
  constructor() {
    super('Goal not found.', GoalsErrorCodes.GOAL_NOT_FOUND as ErrorCode);
  }
}
