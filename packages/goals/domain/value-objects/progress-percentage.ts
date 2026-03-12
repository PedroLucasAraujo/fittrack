import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidProgressPercentageError } from '../errors/invalid-progress-percentage-error.js';

interface ProgressPercentageProps {
  value: number;
}

export class ProgressPercentage extends ValueObject<ProgressPercentageProps> {
  private constructor(props: ProgressPercentageProps) {
    super(props);
  }

  static create(value: number): DomainResult<ProgressPercentage> {
    if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
      return left(new InvalidProgressPercentageError(value));
    }
    return right(new ProgressPercentage({ value }));
  }

  static zero(): ProgressPercentage {
    return new ProgressPercentage({ value: 0 });
  }

  static complete(): ProgressPercentage {
    return new ProgressPercentage({ value: 100 });
  }

  /**
   * Computes progress percentage from baseline, current, and target values.
   * Formula: (current - baseline) / (target - baseline) * 100
   * Clamped to [0, 100].
   *
   * Handles both increasing goals (target > baseline) and decreasing goals
   * (target < baseline, e.g., weight loss).
   */
  static compute(baseline: number, current: number, target: number): ProgressPercentage {
    if (target === baseline) return new ProgressPercentage({ value: 0 });
    const raw = ((current - baseline) / (target - baseline)) * 100;
    const clamped = Math.max(0, Math.min(100, raw));
    return new ProgressPercentage({ value: Math.round(clamped * 100) / 100 });
  }

  get value(): number {
    return this.props.value;
  }
}
