import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidProgressSourceError } from '../errors/invalid-progress-source-error.js';

export const PROGRESS_SOURCES = ['ASSESSMENT', 'METRIC', 'MANUAL'] as const;
export type ProgressSourceValue = (typeof PROGRESS_SOURCES)[number];

interface ProgressSourceProps {
  value: ProgressSourceValue;
}

export class ProgressSource extends ValueObject<ProgressSourceProps> {
  private constructor(props: ProgressSourceProps) {
    super(props);
  }

  static create(source: string): DomainResult<ProgressSource> {
    if (!PROGRESS_SOURCES.includes(source as ProgressSourceValue)) {
      return left(new InvalidProgressSourceError(source));
    }
    return right(new ProgressSource({ value: source as ProgressSourceValue }));
  }

  isAutomatic(): boolean {
    return this.props.value === 'ASSESSMENT' || this.props.value === 'METRIC';
  }

  get value(): ProgressSourceValue {
    return this.props.value;
  }
}
