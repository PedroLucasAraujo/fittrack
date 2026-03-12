import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidFeedbackCommentError } from '../errors/invalid-feedback-comment-error.js';

const MIN_LENGTH = 10;
const MAX_LENGTH = 500;

/**
 * FeedbackComment value object — optional free-text comment on a session.
 *
 * Trimmed on creation. Must be 10–500 characters if provided.
 */
export class FeedbackComment {
  private constructor(readonly value: string) {}

  static create(text: string): DomainResult<FeedbackComment> {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return left(
        new InvalidFeedbackCommentError(
          'comment cannot be blank; omit it instead of passing whitespace',
        ),
      );
    }
    if (trimmed.length < MIN_LENGTH) {
      return left(
        new InvalidFeedbackCommentError(
          `comment must be at least ${MIN_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidFeedbackCommentError(
          `comment must not exceed ${MAX_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }

    return right(new FeedbackComment(trimmed));
  }

  equals(other: FeedbackComment): boolean {
    return this.value === other.value;
  }
}
