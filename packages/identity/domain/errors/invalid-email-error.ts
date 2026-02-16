import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class InvalidEmailError extends DomainError {
  constructor(email: string) {
    super(
      `"${email}" is not a valid email address.`,
      IdentityErrorCodes.INVALID_EMAIL as ErrorCode,
      { email },
    );
  }
}
