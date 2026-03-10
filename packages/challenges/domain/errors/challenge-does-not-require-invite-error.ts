import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeDoesNotRequireInviteError extends DomainError {
  constructor() {
    super(
      'This challenge does not require an invite to join.',
      ChallengeErrorCodes.CHALLENGE_DOES_NOT_REQUIRE_INVITE as ErrorCode,
    );
  }
}
