import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class EmailAlreadyInUseError extends DomainError {
  constructor(email: string) {
    super(
      `Email "${email}" is already in use.`,
      IdentityErrorCodes.EMAIL_ALREADY_IN_USE as ErrorCode,
      { email },
    );
  }
}
