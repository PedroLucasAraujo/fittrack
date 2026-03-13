import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from './engagement-error-codes.js';

export class InvalidEngagementError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid engagement: ${reason}`,
      EngagementErrorCodes.INVALID_ENGAGEMENT as unknown as ErrorCode,
    );
  }
}
