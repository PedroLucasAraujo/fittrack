import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeNotFoundError extends DomainError {
  constructor() {
    super('Challenge not found.', ChallengeErrorCodes.CHALLENGE_NOT_FOUND as ErrorCode);
  }
}
