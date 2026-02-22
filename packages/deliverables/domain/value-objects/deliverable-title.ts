import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidDeliverableError } from '../errors/invalid-deliverable-error.js';

interface DeliverableTitleProps {
  value: string;
}

/**
 * Deliverable title value object.
 *
 * Rules:
 * - 1 to 120 characters after trimming whitespace.
 * - Must be non-empty.
 */
export class DeliverableTitle extends ValueObject<DeliverableTitleProps> {
  static readonly MAX_LENGTH = 120;
  static readonly MIN_LENGTH = 1;

  private constructor(props: DeliverableTitleProps) {
    super(props);
  }

  static create(raw: string): DomainResult<DeliverableTitle> {
    const trimmed = raw.trim();

    if (trimmed.length < DeliverableTitle.MIN_LENGTH) {
      return left(new InvalidDeliverableError('title must not be empty'));
    }

    if (trimmed.length > DeliverableTitle.MAX_LENGTH) {
      return left(
        new InvalidDeliverableError(
          `title must not exceed ${DeliverableTitle.MAX_LENGTH} characters`,
        ),
      );
    }

    return right(new DeliverableTitle({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
