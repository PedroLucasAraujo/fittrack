import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidDurationError extends DomainError {
  constructor(message: string) {
    super(message, ChallengeErrorCodes.INVALID_DURATION as ErrorCode);
  }
}
