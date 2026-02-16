import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(
      `User "${userId}" was not found.`,
      IdentityErrorCodes.USER_NOT_FOUND as ErrorCode,
      { userId },
    );
  }
}
