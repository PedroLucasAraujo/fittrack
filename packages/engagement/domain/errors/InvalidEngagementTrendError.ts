import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from './engagement-error-codes.js';

const VALID_TRENDS = ['IMPROVING', 'STABLE', 'DECLINING'] as const;

export class InvalidEngagementTrendError extends DomainError {
  constructor(value: unknown) {
    super(
      `Engagement trend must be one of ${VALID_TRENDS.join(', ')}; got ${String(value)}`,
      EngagementErrorCodes.INVALID_TREND as unknown as ErrorCode,
    );
  }
}
