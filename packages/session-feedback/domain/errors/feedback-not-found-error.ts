import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class FeedbackNotFoundError extends DomainError {
  constructor(feedbackId: string) {
    super(
      `Session feedback not found: ${feedbackId}`,
      SessionFeedbackErrorCodes.FEEDBACK_NOT_FOUND as unknown as ErrorCode,
      { feedbackId },
    );
  }
}
