import { ValueObject } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidTargetDateError } from '../errors/invalid-target-date-error.js';

interface TargetDateProps {
  /** ISO date string (YYYY-MM-DD). */
  value: string;
}

const FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class TargetDate extends ValueObject<TargetDateProps> {
  private constructor(props: TargetDateProps) {
    super(props);
  }

  /**
   * Creates a TargetDate from a Date object.
   * The date must be in the future (at least tomorrow UTC).
   */
  static create(date: Date): DomainResult<TargetDate> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return left(new InvalidTargetDateError('Must be a valid Date instance.'));
    }
    const value = date.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (value <= todayStr) {
      return left(new InvalidTargetDateError('Target date must be in the future.'));
    }
    return right(new TargetDate({ value }));
  }

  /** Reconstitutes a TargetDate from a stored YYYY-MM-DD string (no future check). */
  static fromString(value: string): DomainResult<TargetDate> {
    if (!FORMAT_REGEX.test(value)) {
      return left(new InvalidTargetDateError(`Invalid format: "${value}". Expected YYYY-MM-DD.`));
    }
    const probe = new Date(`${value}T00:00:00Z`);
    if (isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== value) {
      return left(new InvalidTargetDateError(`"${value}" is not a real calendar date.`));
    }
    return right(new TargetDate({ value }));
  }

  isFuture(): boolean {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.props.value > todayStr;
  }

  daysFromNow(): number {
    const todayMs = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
    const targetMs = new Date(this.props.value + 'T00:00:00Z').getTime();
    return Math.ceil((targetMs - todayMs) / 86_400_000);
  }

  daysSince(startDateStr: string): number {
    const startMs = new Date(startDateStr + 'T00:00:00Z').getTime();
    const targetMs = new Date(this.props.value + 'T00:00:00Z').getTime();
    return Math.ceil((targetMs - startMs) / 86_400_000);
  }

  get value(): string {
    return this.props.value;
  }
}
