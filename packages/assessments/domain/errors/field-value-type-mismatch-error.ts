import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { AssessmentErrorCodes } from './assessment-error-codes.js';
import type { TemplateFieldType } from '../enums/template-field-type.js';

/**
 * Raised by the application layer when a field response value's type does not
 * match the field's declared TemplateFieldType.
 *
 * Example: providing a NUMBER value for a TEXT field.
 * This validation occurs at the application layer (use case), not in the
 * AssessmentResponse aggregate, because type validation requires knowledge of
 * the template's field definitions (cross-aggregate concern).
 */
export class FieldValueTypeMismatchError extends DomainError {
  constructor(fieldId: string, expected: TemplateFieldType, received: string) {
    super(
      `Field ${fieldId} expects type ${expected} but received ${received}`,
      AssessmentErrorCodes.FIELD_VALUE_TYPE_MISMATCH as ErrorCode,
    );
  }
}
