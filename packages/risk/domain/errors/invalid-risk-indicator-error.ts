import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { RiskErrorCodes } from './risk-error-codes.js';

/**
 * Raised when a `RiskIndicators` or `RiskThreshold` value object receives an
 * invalid field value (ADR-0053 §3).
 *
 * The `detail` context field contains a field-description string, not user
 * input, so it is ADR-0037 compliant (no PII in error context).
 */
export class InvalidRiskIndicatorError extends DomainError {
  constructor(detail: string) {
    super(`Invalid risk indicator: ${detail}`, RiskErrorCodes.RISK_INDICATOR_INVALID as ErrorCode, {
      detail,
    });
  }
}
