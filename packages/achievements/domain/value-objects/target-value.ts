import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidCriteriaError } from '../errors/invalid-criteria-error.js';

/**
 * The numeric threshold an achievement requires to be unlocked.
 * Must be a positive integer greater than 0.
 */
export class TargetValue {
  private constructor(readonly value: number) {}

  static create(value: number): DomainResult<TargetValue> {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return left(new InvalidCriteriaError('targetValue must be a finite integer'));
    }
    if (value <= 0) {
      return left(new InvalidCriteriaError('targetValue must be greater than 0'));
    }
    return right(new TargetValue(value));
  }

  equals(other: TargetValue): boolean {
    return this.value === other.value;
  }
}
