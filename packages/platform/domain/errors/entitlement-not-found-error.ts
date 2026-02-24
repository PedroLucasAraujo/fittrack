import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { PlatformErrorCodes } from './platform-error-codes.js';

export class EntitlementNotFoundError extends DomainError {
  constructor(professionalProfileId: string) {
    super(
      `PlatformEntitlement for professional "${professionalProfileId}" was not found.`,
      PlatformErrorCodes.ENTITLEMENT_NOT_FOUND as ErrorCode,
      { professionalProfileId },
    );
  }
}
