import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeFullError extends DomainError {
  constructor() {
    super(
      'Challenge has reached its maximum number of participants.',
      ChallengeErrorCodes.CHALLENGE_FULL as ErrorCode,
    );
  }
}
