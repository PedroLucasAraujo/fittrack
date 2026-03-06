import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class InvalidCriteriaError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid achievement criteria: ${reason}`,
      AchievementErrorCodes.INVALID_CRITERIA as ErrorCode,
    );
  }
}
