import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class ProgressCannotDecreaseError extends DomainError {
  constructor() {
    super(
      'Challenge progress cannot decrease. Progress only moves forward.',
      ChallengeErrorCodes.PROGRESS_CANNOT_DECREASE as ErrorCode,
    );
  }
}
