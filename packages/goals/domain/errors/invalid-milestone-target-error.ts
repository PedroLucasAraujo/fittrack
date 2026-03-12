import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidMilestoneTargetError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid milestone target value: ${reason}`,
      GoalsErrorCodes.INVALID_MILESTONE_TARGET as ErrorCode,
    );
  }
}
