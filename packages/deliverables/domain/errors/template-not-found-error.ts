import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';

/**
 * Raised when a DeliverableTemplate cannot be found for the given id
 * within the requesting tenant's scope (ADR-0025).
 *
 * Always returned as 404 Not Found — never 403 — per ADR-0025.
 */
export class TemplateNotFoundError extends DomainError {
  constructor(templateId: string) {
    super(`Template not found: ${templateId}`, TemplateErrorCodes.TEMPLATE_NOT_FOUND as ErrorCode);
  }
}
