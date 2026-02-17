import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class InvalidRoleError extends DomainError {
  constructor(role: string) {
    super(`"${role}" is not a valid UserRole.`, IdentityErrorCodes.INVALID_ROLE as ErrorCode, {
      role,
    });
  }
}
