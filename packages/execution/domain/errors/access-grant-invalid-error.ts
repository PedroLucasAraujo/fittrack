import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ExecutionErrorCodes } from './execution-error-codes.js';

/**
 * Raised when an AccessGrant fails any of the 5 mandatory validity checks
 * required before Execution creation (ADR-0046 §3):
 *
 * 1. status === ACTIVE
 * 2. clientId matches the requesting client
 * 3. professionalProfileId matches the tenant
 * 4. validUntil is null or not yet expired
 * 5. sessionAllotment is null or sessionsConsumed < sessionAllotment
 */
export class AccessGrantInvalidError extends DomainError {
  constructor(reason: string) {
    super(`Access grant invalid: ${reason}`, ExecutionErrorCodes.ACCESS_GRANT_INVALID as ErrorCode);
  }
}
