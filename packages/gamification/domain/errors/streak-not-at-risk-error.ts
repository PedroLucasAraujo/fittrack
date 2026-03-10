import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/**
 * Raised when useFreezeToken() is called but the streak is not at risk.
 *
 * Freeze tokens should only be spent when the streak is actually in danger
 * (lastActivityDay < yesterday). Using one when not at risk wastes the token.
 */
export class StreakNotAtRiskError extends DomainError {
  constructor() {
    super(
      'Streak is not at risk. Freeze tokens can only be used when lastActivityDay is before yesterday.',
      GamificationErrorCodes.STREAK_NOT_AT_RISK as ErrorCode,
    );
  }
}
