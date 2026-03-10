import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/** Raised when a StreakTracker is expected to exist for a user but is not found. */
export class StreakTrackerNotFoundError extends DomainError {
  constructor() {
    super(
      'StreakTracker not found for this user.',
      GamificationErrorCodes.STREAK_TRACKER_NOT_FOUND as ErrorCode,
    );
  }
}
