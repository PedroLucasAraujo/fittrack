import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidVisibilityError extends DomainError {
  constructor() {
    super(
      'Visibility must be PUBLIC, PROFESSIONAL, or PRIVATE.',
      ChallengeErrorCodes.INVALID_VISIBILITY as ErrorCode,
    );
  }
}
