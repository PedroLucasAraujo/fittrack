import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAssessmentTemplateError } from '../errors/invalid-assessment-template-error.js';

interface TemplateFieldLabelProps {
  value: string;
}

/**
 * AssessmentTemplateField label value object.
 *
 * Rules:
 * - 1 to 100 characters after trimming whitespace.
 * - Must be non-empty.
 *
 * The label is the human-readable name of the field shown to professionals
 * and clients (e.g., "Body Weight", "Waist Circumference"). It is part of
 * the immutable snapshot embedded in Deliverables (ADR-0011 §2).
 */
export class TemplateFieldLabel extends ValueObject<TemplateFieldLabelProps> {
  static readonly MAX_LENGTH = 100;
  static readonly MIN_LENGTH = 1;

  private constructor(props: TemplateFieldLabelProps) {
    super(props);
  }

  static create(raw: string): DomainResult<TemplateFieldLabel> {
    const trimmed = raw.trim();

    if (trimmed.length < TemplateFieldLabel.MIN_LENGTH) {
      return left(new InvalidAssessmentTemplateError('field label must not be empty'));
    }

    if (trimmed.length > TemplateFieldLabel.MAX_LENGTH) {
      return left(
        new InvalidAssessmentTemplateError(
          `field label must not exceed ${TemplateFieldLabel.MAX_LENGTH} characters`,
        ),
      );
    }

    return right(new TemplateFieldLabel({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
