import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidAssessmentTemplateError } from '../errors/invalid-assessment-template-error.js';

interface AssessmentTemplateTitleProps {
  value: string;
}

/**
 * AssessmentTemplate title value object.
 *
 * Rules:
 * - 1 to 120 characters after trimming whitespace.
 * - Must be non-empty.
 *
 * Mirrors the constraint on DeliverableTitle for consistency across
 * prescription-related aggregates.
 */
export class AssessmentTemplateTitle extends ValueObject<AssessmentTemplateTitleProps> {
  static readonly MAX_LENGTH = 120;
  static readonly MIN_LENGTH = 1;

  private constructor(props: AssessmentTemplateTitleProps) {
    super(props);
  }

  static create(raw: string): DomainResult<AssessmentTemplateTitle> {
    const trimmed = raw.trim();

    if (trimmed.length < AssessmentTemplateTitle.MIN_LENGTH) {
      return left(new InvalidAssessmentTemplateError('title must not be empty'));
    }

    if (trimmed.length > AssessmentTemplateTitle.MAX_LENGTH) {
      return left(
        new InvalidAssessmentTemplateError(
          `title must not exceed ${AssessmentTemplateTitle.MAX_LENGTH} characters`,
        ),
      );
    }

    return right(new AssessmentTemplateTitle({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
