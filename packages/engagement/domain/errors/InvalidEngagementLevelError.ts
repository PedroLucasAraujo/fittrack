import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from './engagement-error-codes.js';

const VALID_LEVELS = ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'] as const;

export class InvalidEngagementLevelError extends DomainError {
  constructor(value: unknown) {
    super(
      `Engagement level must be one of ${VALID_LEVELS.join(', ')}; got ${String(value)}`,
      EngagementErrorCodes.INVALID_LEVEL as unknown as ErrorCode,
    );
  }
}
