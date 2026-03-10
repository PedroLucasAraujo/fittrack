import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/** Raised when a freeze token operation is requested but no tokens are available. */
export class NoFreezeTokensAvailableError extends DomainError {
  constructor() {
    super(
      'No freeze tokens available. Earn tokens by maintaining a streak for 7 consecutive days.',
      GamificationErrorCodes.NO_FREEZE_TOKENS_AVAILABLE as ErrorCode,
    );
  }
}
