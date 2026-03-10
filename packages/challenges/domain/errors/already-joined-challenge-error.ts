import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class AlreadyJoinedChallengeError extends DomainError {
  constructor() {
    super(
      'User has already joined this challenge.',
      ChallengeErrorCodes.ALREADY_JOINED_CHALLENGE as ErrorCode,
    );
  }
}
