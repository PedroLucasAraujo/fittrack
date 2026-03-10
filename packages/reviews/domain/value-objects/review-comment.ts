import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidCommentError } from '../errors/invalid-comment-error.js';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

/**
 * Optional text comment left by the client on the review.
 * Must be between 10 and 1000 characters (trimmed).
 */
export class ReviewComment {
  private constructor(readonly value: string) {}

  /**
   * Creates a ReviewComment.
   * Returns Left<InvalidCommentError> if the trimmed text is shorter than
   * 10 or longer than 1000 characters.
   */
  static create(text: string): DomainResult<ReviewComment> {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return left(new InvalidCommentError('comment cannot be blank'));
    }
    if (trimmed.length < MIN_LENGTH) {
      return left(
        new InvalidCommentError(
          `comment must be at least ${MIN_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidCommentError(
          `comment must not exceed ${MAX_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }

    return right(new ReviewComment(trimmed));
  }

  equals(other: ReviewComment): boolean {
    return this.value === other.value;
  }
}
