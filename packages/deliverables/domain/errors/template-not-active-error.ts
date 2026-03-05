import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';

/**
 * Raised when an operation requires ACTIVE status but the template is not ACTIVE.
 * For example, instantiation of a DRAFT or ARCHIVED template is rejected.
 */
export class TemplateNotActiveError extends DomainError {
  constructor(templateId: string) {
    super(
      `Template cannot be instantiated because it is not ACTIVE: ${templateId}`,
      TemplateErrorCodes.TEMPLATE_NOT_ACTIVE as ErrorCode,
    );
  }
}
