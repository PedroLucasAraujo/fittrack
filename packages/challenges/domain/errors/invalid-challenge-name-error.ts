import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidChallengeNameError extends DomainError {
  constructor() {
    super(
      'Challenge name must be between 3 and 100 characters.',
      ChallengeErrorCodes.INVALID_CHALLENGE_NAME as ErrorCode,
    );
  }
}
