import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidCommentError } from '../errors/invalid-comment-error.js';

const MIN_LENGTH = 10;
const MAX_LENGTH = 500;

/**
 * A professional's public response to a client review.
 * Must be between 10 and 500 characters (trimmed).
 */
export class ProfessionalResponse {
  private constructor(readonly value: string) {}

  /**
   * Creates a ProfessionalResponse.
   * Returns Left<InvalidCommentError> if the trimmed text falls outside [10, 500].
   */
  static create(text: string): DomainResult<ProfessionalResponse> {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return left(new InvalidCommentError('professional response cannot be blank'));
    }
    if (trimmed.length < MIN_LENGTH) {
      return left(
        new InvalidCommentError(
          `professional response must be at least ${MIN_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidCommentError(
          `professional response must not exceed ${MAX_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }

    return right(new ProfessionalResponse(trimmed));
  }

  equals(other: ProfessionalResponse): boolean {
    return this.value === other.value;
  }
}
