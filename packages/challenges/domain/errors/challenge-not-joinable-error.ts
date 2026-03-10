import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeNotJoinableError extends DomainError {
  constructor() {
    super(
      'Challenge is not open for joining. It may be inactive, ended, or canceled.',
      ChallengeErrorCodes.CHALLENGE_NOT_JOINABLE as ErrorCode,
    );
  }
}
