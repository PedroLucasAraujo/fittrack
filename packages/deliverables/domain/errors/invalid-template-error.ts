import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';

/**
 * Raised when template input fails validation (name, description, structure, etc.).
 */
export class InvalidTemplateError extends DomainError {
  constructor(reason: string) {
    super(`Invalid template: ${reason}`, TemplateErrorCodes.INVALID_TEMPLATE as ErrorCode);
  }
}
