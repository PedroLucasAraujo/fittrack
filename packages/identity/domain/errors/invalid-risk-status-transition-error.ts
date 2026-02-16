import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

/**
 * Raised when a RiskStatus transition violates the rules in ADR-0022 §2.
 * BANNED is terminal — no transitions out.
 */
export class InvalidRiskStatusTransitionError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(
      `Cannot transition RiskStatus from "${currentStatus}" to "${attemptedStatus}".`,
      IdentityErrorCodes.INVALID_RISK_STATUS_TRANSITION as ErrorCode,
      { currentStatus, attemptedStatus },
    );
  }
}
