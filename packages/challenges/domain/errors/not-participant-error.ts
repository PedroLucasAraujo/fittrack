import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class NotParticipantError extends DomainError {
  constructor() {
    super(
      'User is not a participant in this challenge.',
      ChallengeErrorCodes.NOT_PARTICIPANT as ErrorCode,
    );
  }
}
