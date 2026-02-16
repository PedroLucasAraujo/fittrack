import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class UserAlreadyHasProfileError extends DomainError {
  constructor(userId: string) {
    super(
      `User "${userId}" already has a ProfessionalProfile.`,
      IdentityErrorCodes.USER_ALREADY_HAS_PROFILE as ErrorCode,
      { userId },
    );
  }
}
