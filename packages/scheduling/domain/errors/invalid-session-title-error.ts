import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class InvalidSessionTitleError extends DomainError {
  constructor(title: string) {
    super(
      `Session title must be between 1 and 120 characters. Received length: ${title.length}.`,
      SchedulingErrorCodes.INVALID_SESSION_TITLE as ErrorCode,
      { titleLength: title.length },
    );
  }
}
