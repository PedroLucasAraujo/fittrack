import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from './engagement-error-codes.js';

export class EngagementNotFoundError extends DomainError {
  constructor(userId: string) {
    super(
      `UserEngagement not found for user ${userId}`,
      EngagementErrorCodes.ENGAGEMENT_NOT_FOUND as unknown as ErrorCode,
      { userId },
    );
  }
}
