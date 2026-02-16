import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class ProfessionalProfileNotFoundError extends DomainError {
  constructor(profileId: string) {
    super(
      `ProfessionalProfile "${profileId}" was not found.`,
      IdentityErrorCodes.PROFESSIONAL_PROFILE_NOT_FOUND as ErrorCode,
      { profileId },
    );
  }
}
