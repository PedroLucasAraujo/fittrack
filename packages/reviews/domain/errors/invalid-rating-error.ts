import { DomainError } from '@fittrack/core';
import { ReviewErrorCodes } from './review-error-codes.js';
import type { ReviewErrorCode } from './review-error-codes.js';

export class InvalidRatingError extends DomainError {
  constructor(value: unknown) {
    super(
      `Invalid rating: ${String(value)}. Must be an integer between 1 and 5.`,
      ReviewErrorCodes.INVALID_RATING as ReviewErrorCode,
      { value },
    );
  }
}
