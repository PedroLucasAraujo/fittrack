import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GoalsErrorCodes } from './goals-error-codes.js';

export class InvalidProgressSourceError extends DomainError {
  constructor(received: string) {
    super(
      `Invalid progress source: "${received}". Must be one of: ASSESSMENT, METRIC, MANUAL.`,
      GoalsErrorCodes.INVALID_PROGRESS_SOURCE as ErrorCode,
    );
  }
}
