import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ChallengeNotAuthorizedError extends DomainError {
  constructor() {
    super(
      'Not authorized to perform this action on the challenge.',
      ChallengeErrorCodes.NOT_AUTHORIZED as ErrorCode,
    );
  }
}
