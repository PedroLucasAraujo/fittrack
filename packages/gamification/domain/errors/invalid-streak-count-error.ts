import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/** Raised when a streak count value violates domain invariants (negative, non-integer, overflow). */
export class InvalidStreakCountError extends DomainError {
  constructor(reason: string) {
    super(reason, GamificationErrorCodes.INVALID_STREAK_COUNT as ErrorCode);
  }
}
