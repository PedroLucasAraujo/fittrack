import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class AchievementCodeAlreadyExistsError extends DomainError {
  constructor(code: string) {
    super(
      `Achievement code already exists: ${code}`,
      AchievementErrorCodes.ACHIEVEMENT_CODE_ALREADY_EXISTS as ErrorCode,
    );
  }
}
