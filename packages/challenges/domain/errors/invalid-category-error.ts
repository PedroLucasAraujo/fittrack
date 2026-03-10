import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ChallengeErrorCodes } from './challenge-error-codes.js';

export class InvalidCategoryError extends DomainError {
  constructor() {
    super(
      'Category must be WORKOUT, NUTRITION, STREAK, or VOLUME.',
      ChallengeErrorCodes.INVALID_CATEGORY as ErrorCode,
    );
  }
}
