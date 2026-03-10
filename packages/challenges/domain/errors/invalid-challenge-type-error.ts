import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidChallengeTypeError extends DomainError {
  constructor() {
    super(
      'Challenge type must be INDIVIDUAL, COMMUNITY, or HEAD_TO_HEAD.',
      ChallengeErrorCodes.INVALID_CHALLENGE_TYPE as ErrorCode,
    );
  }
}
