import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';

/**
 * Raised when a template with the same name already exists for the professional.
 * Template names must be unique per professional (ADR-0025 tenant isolation).
 */
export class TemplateNameAlreadyExistsError extends DomainError {
  constructor() {
    super(
      'A template with this name already exists for this professional',
      TemplateErrorCodes.TEMPLATE_NAME_ALREADY_EXISTS as ErrorCode,
    );
  }
}
