import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeNotActiveError extends DomainError {
  constructor() {
    super(
      'Challenge is not currently active.',
      ChallengeErrorCodes.CHALLENGE_NOT_ACTIVE as ErrorCode,
    );
  }
}
