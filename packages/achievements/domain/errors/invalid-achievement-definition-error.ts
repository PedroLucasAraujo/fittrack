import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class InvalidAchievementDefinitionError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid achievement definition: ${reason}`,
      AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION as ErrorCode,
    );
  }
}
