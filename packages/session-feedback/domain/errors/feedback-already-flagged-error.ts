import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class FeedbackAlreadyFlaggedError extends DomainError {
  constructor(feedbackId: string) {
    super(
      `Feedback ${feedbackId} has already been flagged for moderation.`,
      SessionFeedbackErrorCodes.FEEDBACK_ALREADY_FLAGGED as unknown as ErrorCode,
      { feedbackId },
    );
  }
}
