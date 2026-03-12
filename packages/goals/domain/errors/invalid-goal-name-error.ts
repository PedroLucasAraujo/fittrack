import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidGoalNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid goal name: ${reason}`, GoalsErrorCodes.INVALID_GOAL_NAME as ErrorCode);
  }
}
