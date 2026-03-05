import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';

/**
 * Raised when the template structure is invalid for the given type.
 * For example, a TRAINING_PRESCRIPTION template requires at least one session.
 */
export class InvalidTemplateStructureError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid template structure: ${reason}`,
      TemplateErrorCodes.INVALID_TEMPLATE_STRUCTURE as ErrorCode,
    );
  }
}
