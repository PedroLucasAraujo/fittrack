import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeNotEndedError extends DomainError {
  constructor() {
    super('Challenge has not ended yet.', ChallengeErrorCodes.CHALLENGE_NOT_ENDED as ErrorCode);
  }
}
