import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidCommentError } from '../errors/invalid-comment-error.js';

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

/**
 * The reason provided when a professional or admin flags a review for moderation.
 */
export class FlagReason {
  private constructor(readonly value: string) {}

  /**
   * Creates a FlagReason.
   * Returns Left<InvalidCommentError> if the trimmed reason is too short or too long.
   */
  static create(reason: string): DomainResult<FlagReason> {
    const trimmed = reason.trim();

    if (trimmed.length < MIN_LENGTH) {
      return left(
        new InvalidCommentError(
          `flag reason must be at least ${MIN_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }
    if (trimmed.length > MAX_LENGTH) {
      return left(
        new InvalidCommentError(
          `flag reason must not exceed ${MAX_LENGTH} characters; got ${trimmed.length}`,
        ),
      );
    }

    return right(new FlagReason(trimmed));
  }

  equals(other: FlagReason): boolean {
    return this.value === other.value;
  }
}
