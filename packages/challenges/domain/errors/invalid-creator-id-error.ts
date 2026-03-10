import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidCreatorIdError extends DomainError {
  constructor() {
    super(
      'Creator ID must be a valid UUIDv4.',
      ChallengeErrorCodes.INVALID_CREATOR_ID as ErrorCode,
    );
  }
}
