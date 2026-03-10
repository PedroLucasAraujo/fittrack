import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidGoalTargetError extends DomainError {
  constructor() {
    super(
      'Goal target must be a positive integer between 1 and 10000.',
      ChallengeErrorCodes.INVALID_GOAL_TARGET as ErrorCode,
    );
  }
}
