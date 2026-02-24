import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { PlatformErrorCodes } from './platform-error-codes.js';

export class InvalidEntitlementTransitionError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, PlatformErrorCodes.INVALID_TRANSITION as ErrorCode, context);
  }
}
