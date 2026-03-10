import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeAlreadyEndedError extends DomainError {
  constructor() {
    super('Challenge has already ended.', ChallengeErrorCodes.CHALLENGE_ALREADY_ENDED as ErrorCode);
  }
}
