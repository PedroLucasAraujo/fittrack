import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

/**
 * Raised when a ProfessionalProfile state transition is not valid
 * according to the state machine defined in ADR-0008 §3.
 */
export class InvalidProfileTransitionError extends DomainError {
  constructor(currentStatus: string, attemptedStatus: string) {
    super(
      `Cannot transition ProfessionalProfile from "${currentStatus}" to "${attemptedStatus}".`,
      IdentityErrorCodes.INVALID_PROFILE_TRANSITION as ErrorCode,
      { currentStatus, attemptedStatus },
    );
  }
}
