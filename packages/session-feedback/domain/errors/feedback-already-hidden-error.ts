import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class FeedbackAlreadyHiddenError extends DomainError {
  constructor(feedbackId: string) {
    super(
      `Feedback ${feedbackId} is already hidden.`,
      SessionFeedbackErrorCodes.FEEDBACK_ALREADY_HIDDEN as unknown as ErrorCode,
      { feedbackId },
    );
  }
}
