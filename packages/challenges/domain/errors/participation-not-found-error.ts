import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ParticipationNotFoundError extends DomainError {
  constructor() {
    super(
      'Challenge participation not found.',
      ChallengeErrorCodes.PARTICIPATION_NOT_FOUND as ErrorCode,
    );
  }
}
