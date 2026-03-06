import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AchievementErrorCodes } from './achievement-error-codes.js';

export class InvalidProgressValueError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid progress value: ${reason}`,
      AchievementErrorCodes.INVALID_PROGRESS_VALUE as ErrorCode,
    );
  }
}
