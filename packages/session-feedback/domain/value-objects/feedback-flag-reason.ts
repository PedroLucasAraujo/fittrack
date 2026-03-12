import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidFeedbackCommentError } from '../errors/invalid-feedback-comment-error.js';

const MIN_LENGTH = 10;
const MAX_LENGTH = 200;

/**
 * FeedbackFlagReason value object — reason provided when flagging a feedback
 * for moderation review. Trimmed on creation.
 */
export class FeedbackFlagReason {
  private constructor(readonly value: string) {}

  static create(reason: string): DomainResult<FeedbackFlagReason> {
    const trimmed = reason.trim();

    if (trimmed.length < MIN_LENGTH) {
      return left(
        new InvalidFeedbackCommentError(
          `flag reason must be at least ${MIN_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidFeedbackCommentError(
          `flag reason must not exceed ${MAX_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }

    return right(new FeedbackFlagReason(trimmed));
  }

  equals(other: FeedbackFlagReason): boolean {
    return this.value === other.value;
  }
}
