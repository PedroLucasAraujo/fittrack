import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidProgressValueError } from '../errors/invalid-progress-value-error.js';

/**
 * The current progress value toward an achievement's target.
 * Must be a non-negative finite integer.
 * In the MVP, this value only increases (never decreases).
 */
export class CurrentValue {
  private constructor(readonly value: number) {}

  static create(value: number): DomainResult<CurrentValue> {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return left(new InvalidProgressValueError('currentValue must be a finite integer'));
    }
    if (value < 0) {
      return left(new InvalidProgressValueError('currentValue must be non-negative'));
    }
    return right(new CurrentValue(value));
  }

  static zero(): CurrentValue {
    return new CurrentValue(0);
  }

  increment(): CurrentValue {
    return new CurrentValue(this.value + 1);
  }

  equals(other: CurrentValue): boolean {
    return this.value === other.value;
  }
}
