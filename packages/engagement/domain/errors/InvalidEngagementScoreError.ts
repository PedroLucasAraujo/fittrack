import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from './engagement-error-codes.js';

export class InvalidEngagementScoreError extends DomainError {
  constructor(value: unknown) {
    super(
      `Engagement score must be an integer between 0 and 100; got ${String(value)}`,
      EngagementErrorCodes.INVALID_SCORE as unknown as ErrorCode,
    );
  }
}
