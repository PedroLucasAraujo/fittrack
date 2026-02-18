import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidTimeSlotError } from '../errors/invalid-time-slot-error.js';

interface TimeSlotProps {
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

/**
 * An immutable time window within a single day, represented as HH:mm start/end.
 *
 * Used by WorkingAvailability to define when a professional is available.
 * End time must be strictly after start time.
 */
export class TimeSlot extends ValueObject<TimeSlotProps> {
  private static readonly TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

  private constructor(props: TimeSlotProps) {
    super(props);
  }

  static create(startTime: string, endTime: string): DomainResult<TimeSlot> {
    if (!TimeSlot.TIME_REGEX.test(startTime)) {
      return left(
        new InvalidTimeSlotError(
          `Invalid start time format: "${startTime}". Expected HH:mm (00:00–23:59).`,
        ),
      );
    }

    if (!TimeSlot.TIME_REGEX.test(endTime)) {
      return left(
        new InvalidTimeSlotError(
          `Invalid end time format: "${endTime}". Expected HH:mm (00:00–23:59).`,
        ),
      );
    }

    if (startTime >= endTime) {
      return left(
        new InvalidTimeSlotError(`Start time "${startTime}" must be before end time "${endTime}".`),
      );
    }

    return right(new TimeSlot({ startTime, endTime }));
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get endTime(): string {
    return this.props.endTime;
  }

  /**
   * Returns true if this slot overlaps with another slot.
   * Two slots overlap when one starts before the other ends and vice versa.
   */
  overlapsWith(other: TimeSlot): boolean {
    return this.props.startTime < other.props.endTime && other.props.startTime < this.props.endTime;
  }

  toString(): string {
    return `${this.props.startTime}–${this.props.endTime}`;
  }
}
