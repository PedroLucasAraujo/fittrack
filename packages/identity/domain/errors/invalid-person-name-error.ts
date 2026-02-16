import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { IdentityErrorCodes } from './identity-error-codes.js';

export class InvalidPersonNameError extends DomainError {
  constructor(name: string, reason: string) {
    super(
      `Invalid person name: ${reason}. Received: "${name}".`,
      IdentityErrorCodes.INVALID_PERSON_NAME as ErrorCode,
      { name },
    );
  }
}
