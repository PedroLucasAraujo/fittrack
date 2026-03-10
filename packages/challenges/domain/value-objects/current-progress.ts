import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidProgressError } from '../errors/invalid-progress-error.js';

export interface CurrentProgressProps {
  value: number;
}

export class CurrentProgress extends ValueObject<CurrentProgressProps> {
  private constructor(props: CurrentProgressProps) {
    super(props);
  }

  static create(value: number): DomainResult<CurrentProgress> {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) {
      return left(new InvalidProgressError());
    }
    return right(new CurrentProgress({ value }));
  }

  static zero(): CurrentProgress {
    return new CurrentProgress({ value: 0 });
  }

  get value(): number {
    return this.props.value;
  }

  increment(amount: number): DomainResult<CurrentProgress> {
    if (typeof amount !== 'number' || !isFinite(amount) || amount < 0) {
      return left(new InvalidProgressError());
    }
    return right(new CurrentProgress({ value: this.props.value + amount }));
  }

  hasReached(target: number): boolean {
    return this.props.value >= target;
  }
}
