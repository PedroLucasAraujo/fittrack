import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class SessionNotFoundError extends DomainError {
  constructor(sessionId: string) {
    super(`Session not found.`, SchedulingErrorCodes.SESSION_NOT_FOUND as ErrorCode, { sessionId });
  }
}
