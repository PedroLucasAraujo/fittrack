import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidDurationError } from '../errors/invalid-duration-error.js';

interface DurationMinutesProps {
  value: number;
}

/**
 * Duration in whole minutes for a session or time slot.
 *
 * Must be a positive integer between 1 and 480 (8 hours).
 */
export class DurationMinutes extends ValueObject<DurationMinutesProps> {
  private static readonly MIN = 1;
  private static readonly MAX = 480;

  private constructor(props: DurationMinutesProps) {
    super(props);
  }

  static create(minutes: number): DomainResult<DurationMinutes> {
    if (
      !Number.isInteger(minutes) ||
      minutes < DurationMinutes.MIN ||
      minutes > DurationMinutes.MAX
    ) {
      return left(new InvalidDurationError(minutes));
    }

    return right(new DurationMinutes({ value: minutes }));
  }

  get value(): number {
    return this.props.value;
  }

  toString(): string {
    return `${this.props.value}min`;
  }
}
