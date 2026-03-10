import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidProgressError extends DomainError {
  constructor() {
    super(
      'Progress value must be a non-negative number.',
      ChallengeErrorCodes.INVALID_PROGRESS as ErrorCode,
    );
  }
}
