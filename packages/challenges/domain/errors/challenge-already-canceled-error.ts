import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeAlreadyCanceledError extends DomainError {
  constructor() {
    super(
      'Challenge has already been canceled.',
      ChallengeErrorCodes.CHALLENGE_ALREADY_CANCELED as ErrorCode,
    );
  }
}
