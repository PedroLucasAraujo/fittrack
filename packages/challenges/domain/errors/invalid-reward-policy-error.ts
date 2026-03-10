import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidRewardPolicyError extends DomainError {
  constructor() {
    super(
      'Reward policy must be WINNER, TOP_3, TOP_10, or ALL_COMPLETERS.',
      ChallengeErrorCodes.INVALID_REWARD_POLICY as ErrorCode,
    );
  }
}
