import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidProgressPercentageError } from '../errors/invalid-progress-percentage-error.js';

export interface ProgressPercentageProps {
  value: number;
}

export class ProgressPercentage extends ValueObject<ProgressPercentageProps> {
  private constructor(props: ProgressPercentageProps) {
    super(props);
  }

  static create(value: number): DomainResult<ProgressPercentage> {
    if (typeof value !== 'number' || !isFinite(value) || value < 0 || value > 100) {
      return left(new InvalidProgressPercentageError());
    }
    return right(new ProgressPercentage({ value }));
  }

  static calculate(current: number, target: number): DomainResult<ProgressPercentage> {
    if (target <= 0) {
      return right(new ProgressPercentage({ value: 100 }));
    }
    const raw = (current / target) * 100;
    const capped = Math.min(100, Math.round(raw));
    return right(new ProgressPercentage({ value: capped }));
  }

  get value(): number {
    return this.props.value;
  }

  isComplete(): boolean {
    return this.props.value >= 100;
  }
}
