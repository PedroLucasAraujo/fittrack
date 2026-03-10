import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidChallengeDescriptionError extends DomainError {
  constructor() {
    super(
      'Challenge description must be between 10 and 1000 characters.',
      ChallengeErrorCodes.INVALID_CHALLENGE_DESCRIPTION as ErrorCode,
    );
  }
}
