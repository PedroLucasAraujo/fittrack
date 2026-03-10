import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { GamificationErrorCodes } from './gamification-error-codes.js';

/** Raised when a userId is not a valid UUIDv4. */
export class InvalidUserIdError extends DomainError {
  constructor() {
    super('userId must be a valid UUIDv4.', GamificationErrorCodes.INVALID_USER_ID as ErrorCode);
  }
}
