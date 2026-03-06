import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class AchievementAlreadyUnlockedError extends DomainError {
  constructor() {
    super(
      'Achievement is already unlocked',
      AchievementErrorCodes.ACHIEVEMENT_ALREADY_UNLOCKED as ErrorCode,
    );
  }
}
