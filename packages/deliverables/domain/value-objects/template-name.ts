import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidTemplateError } from '../errors/invalid-template-error.js';

interface TemplateNameProps {
  value: string;
}

/**
 * Template name value object.
 *
 * Rules:
 * - 3 to 100 characters after trimming whitespace.
 * - Must not be empty.
 */
export class TemplateName extends ValueObject<TemplateNameProps> {
  static readonly MIN_LENGTH = 3;
  static readonly MAX_LENGTH = 100;

  private constructor(props: TemplateNameProps) {
    super(props);
  }

  static create(raw: string): DomainResult<TemplateName> {
    const trimmed = raw.trim();

    if (trimmed.length < TemplateName.MIN_LENGTH) {
      return left(
        new InvalidTemplateError(
          `template name must be at least ${TemplateName.MIN_LENGTH} characters`,
        ),
      );
    }

    if (trimmed.length > TemplateName.MAX_LENGTH) {
      return left(
        new InvalidTemplateError(
          `template name must not exceed ${TemplateName.MAX_LENGTH} characters`,
        ),
      );
    }

    return right(new TemplateName({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
