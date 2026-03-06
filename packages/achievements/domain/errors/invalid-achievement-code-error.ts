import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class InvalidAchievementCodeError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid achievement code: ${reason}`,
      AchievementErrorCodes.INVALID_ACHIEVEMENT_CODE as ErrorCode,
    );
  }
}
