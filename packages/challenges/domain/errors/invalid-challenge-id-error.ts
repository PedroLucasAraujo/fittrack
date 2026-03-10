import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidChallengeIdError extends DomainError {
  constructor() {
    super(
      'Challenge ID must be a valid UUIDv4.',
      ChallengeErrorCodes.INVALID_CHALLENGE_ID as ErrorCode,
    );
  }
}
