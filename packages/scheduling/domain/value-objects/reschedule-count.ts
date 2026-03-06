import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidReschedulingPolicyError } from '../errors/invalid-rescheduling-policy-error.js';

interface RescheduleCountProps {
  value: number;
}

/**
 * Tracks how many times a Booking has been rescheduled.
 *
 * Immutable — `increment()` returns a new VO instance rather than mutating.
 * Always a non-negative integer.
 */
export class RescheduleCount extends ValueObject<RescheduleCountProps> {
  private constructor(props: RescheduleCountProps) {
    super(props);
  }

  static create(value: number): DomainResult<RescheduleCount> {
    if (!Number.isInteger(value) || value < 0) {
      return left(
        new InvalidReschedulingPolicyError(
          `RescheduleCount must be a non-negative integer. Received: ${value}`,
        ),
      );
    }

    return right(new RescheduleCount({ value }));
  }

  /** Creates a zero-value counter for new bookings. */
  static zero(): RescheduleCount {
    return new RescheduleCount({ value: 0 });
  }

  /** Returns a new RescheduleCount with value incremented by 1. */
  increment(): RescheduleCount {
    return new RescheduleCount({ value: this.props.value + 1 });
  }

  /** Returns true if this count has reached or exceeded the given maximum. */
  exceeds(max: number): boolean {
    return this.props.value >= max;
  }

  get value(): number {
    return this.props.value;
  }
}
