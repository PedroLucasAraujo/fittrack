import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { RiskErrorCodes } from './risk-error-codes.js';

/**
 * Raised when the `reason` supplied to a Risk use case is blank or exceeds
 * the 500-character maximum (ADR-0022 §5).
 */
export class InvalidRiskReasonError extends DomainError {
  constructor(reason: string) {
    super(
      'Risk reason must be a non-empty string with at most 500 characters.',
      RiskErrorCodes.INVALID_REASON as ErrorCode,
      { reasonLength: reason.length },
    );
  }
}
