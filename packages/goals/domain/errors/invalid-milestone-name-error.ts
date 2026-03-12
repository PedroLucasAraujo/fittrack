import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidMilestoneNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid milestone name: ${reason}`, GoalsErrorCodes.INVALID_MILESTONE_NAME as ErrorCode);
  }
}
