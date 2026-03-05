import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { TemplateErrorCodes } from './template-error-codes.js';
import type { TemplateStatus } from '../enums/template-status.js';

/**
 * Raised when a lifecycle transition is attempted that is not permitted
 * by the template state machine.
 */
export class InvalidTemplateTransitionError extends DomainError {
  constructor(from: TemplateStatus, to: TemplateStatus) {
    super(
      `Invalid template transition: ${from} → ${to}`,
      TemplateErrorCodes.INVALID_TEMPLATE_TRANSITION as ErrorCode,
    );
  }
}
