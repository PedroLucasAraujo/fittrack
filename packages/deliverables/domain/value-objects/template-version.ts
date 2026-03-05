import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidTemplateError } from '../errors/invalid-template-error.js';

interface TemplateVersionProps {
  value: number;
}

/**
 * Template version value object.
 *
 * Versions are positive integers starting at 1.
 * Each call to `CreateTemplateVersion` produces a new template with version incremented by 1.
 * The chain of versions is tracked via `previousVersionId` on the aggregate.
 */
export class TemplateVersion extends ValueObject<TemplateVersionProps> {
  private constructor(props: TemplateVersionProps) {
    super(props);
  }

  static create(version: number): DomainResult<TemplateVersion> {
    if (!Number.isInteger(version) || version < 1) {
      return left(new InvalidTemplateError('template version must be a positive integer'));
    }
    return right(new TemplateVersion({ value: version }));
  }

  /** Returns a new TemplateVersion with value incremented by 1. */
  increment(): TemplateVersion {
    return new TemplateVersion({ value: this.props.value + 1 });
  }

  get value(): number {
    return this.props.value;
  }

  /** Human-readable label, e.g. "v1", "v2". */
  get label(): string {
    return `v${this.props.value}`;
  }
}
