import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/** Raised when an activity day value is malformed or represents a future date. */
export class InvalidActivityDayError extends DomainError {
  constructor(reason: string) {
    super(reason, GamificationErrorCodes.INVALID_ACTIVITY_DAY as ErrorCode);
  }
}
