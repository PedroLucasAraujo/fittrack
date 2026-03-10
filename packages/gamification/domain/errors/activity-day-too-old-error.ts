import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/**
 * Raised when an activity day is more than 2 calendar days in the past.
 *
 * The 2-day retroactive correction window prevents:
 * - Fraudulent backdating of activity
 * - Exploitation of delayed event processing for streak manipulation
 */
export class ActivityDayTooOldError extends DomainError {
  constructor() {
    super(
      'Cannot record activity older than 2 days. Retroactive correction window is 2 days.',
      GamificationErrorCodes.ACTIVITY_DAY_TOO_OLD as ErrorCode,
    );
  }
}
