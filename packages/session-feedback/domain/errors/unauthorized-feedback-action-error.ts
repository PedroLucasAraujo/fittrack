import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SessionFeedbackErrorCodes } from './session-feedback-error-codes.js';

export class UnauthorizedFeedbackActionError extends DomainError {
  constructor(action: string) {
    super(
      `Unauthorized feedback action: ${action}`,
      SessionFeedbackErrorCodes.UNAUTHORIZED_ACTION as unknown as ErrorCode,
    );
  }
}
