import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';

/**
 * Raised when an attempt is made to edit an ACTIVE or ARCHIVED template.
 * Only DRAFT templates may be edited directly; ACTIVE templates require
 * creating a new version via CreateTemplateVersion.
 */
export class TemplateCannotBeEditedError extends DomainError {
  constructor(templateId: string) {
    super(
      `Template cannot be edited because it is not in DRAFT status: ${templateId}`,
      TemplateErrorCodes.TEMPLATE_CANNOT_BE_EDITED as ErrorCode,
    );
  }
}
