import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeAlreadyStartedError extends DomainError {
  constructor() {
    super(
      'Challenge has already been started.',
      ChallengeErrorCodes.CHALLENGE_ALREADY_STARTED as ErrorCode,
    );
  }
}
