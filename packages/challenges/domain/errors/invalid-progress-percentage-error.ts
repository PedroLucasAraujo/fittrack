import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidProgressPercentageError extends DomainError {
  constructor() {
    super(
      'Progress percentage must be between 0 and 100.',
      ChallengeErrorCodes.INVALID_PROGRESS_PERCENTAGE as ErrorCode,
    );
  }
}
