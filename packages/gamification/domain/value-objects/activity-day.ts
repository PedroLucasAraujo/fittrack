import { ValueObject } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import { InvalidActivityDayError } from '../errors/invalid-activity-day-error.js';

/** One day in milliseconds. */
const ONE_DAY_MS = 86_400_000;

/** YYYY-MM-DD regex. */
const FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface ActivityDayProps {
  /** ISO calendar date in YYYY-MM-DD format, always representing UTC midnight. */
  value: string;
}

/**
 * A calendar date used for streak calculations, always anchored to UTC midnight.
 *
 * Unlike `LogicalDay` (which is timezone-aware), `ActivityDay` is always UTC.
 * All streak comparisons are performed on UTC dates to avoid:
 * - DST transitions breaking consecutive-day checks
 * - Timezone changes retroactively affecting streak history
 *
 * ## Creation
 *
 * Use `ActivityDay.create(date)` to normalize a `Date` object to UTC midnight.
 * Use `ActivityDay.fromString(value)` only when reconstituting from a stored
 * YYYY-MM-DD value that was already written by this class.
 * Use `ActivityDay.today()` / `ActivityDay.yesterday()` for reference dates.
 */
export class ActivityDay extends ValueObject<ActivityDayProps> {
  private constructor(props: ActivityDayProps) {
    super(props);
  }

  /**
   * Creates an ActivityDay from a Date, normalizing to UTC midnight (YYYY-MM-DD).
   *
   * The time portion is discarded. Any valid Date produces a valid ActivityDay.
   */
  static create(date: Date): DomainResult<ActivityDay> {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return left(new InvalidActivityDayError('ActivityDay requires a valid Date instance.'));
    }
    const value = date.toISOString().slice(0, 10);
    return right(new ActivityDay({ value }));
  }

  /**
   * Creates an ActivityDay from a YYYY-MM-DD string.
   *
   * Use this factory when reconstituting a value already stored in this format.
   */
  static fromString(value: string): DomainResult<ActivityDay> {
    if (!FORMAT_REGEX.test(value)) {
      return left(
        new InvalidActivityDayError(`Invalid ActivityDay format: "${value}". Expected YYYY-MM-DD.`),
      );
    }
    // Reject impossible calendar dates (e.g., "2024-02-30") by round-tripping through Date
    const probe = new Date(`${value}T00:00:00Z`);
    if (isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== value) {
      return left(
        new InvalidActivityDayError(`"${value}" does not represent a real calendar date.`),
      );
    }
    return right(new ActivityDay({ value }));
  }

  /** Returns today's date in UTC (YYYY-MM-DD). */
  static today(): ActivityDay {
    return new ActivityDay({ value: new Date().toISOString().slice(0, 10) });
  }

  /** Returns yesterday's date in UTC (YYYY-MM-DD). */
  static yesterday(): ActivityDay {
    const ms = Date.now() - ONE_DAY_MS;
    return new ActivityDay({ value: new Date(ms).toISOString().slice(0, 10) });
  }

  /**
   * True if this day is strictly before `other`.
   * YYYY-MM-DD strings sort lexicographically, so direct comparison is safe.
   */
  isBefore(other: ActivityDay): boolean {
    return this.props.value < other.props.value;
  }

  /** True if this day is strictly after `other`. */
  isAfter(other: ActivityDay): boolean {
    return this.props.value > other.props.value;
  }

  /**
   * True if `other` is exactly 1 calendar day after `this`.
   * Used to detect consecutive days in streak tracking.
   */
  isConsecutiveTo(other: ActivityDay): boolean {
    const thisMs = new Date(`${this.props.value}T00:00:00Z`).getTime();
    const otherMs = new Date(`${other.props.value}T00:00:00Z`).getTime();
    return otherMs - thisMs === ONE_DAY_MS;
  }

  /**
   * Absolute number of calendar days between this and `other`.
   */
  daysBetween(other: ActivityDay): number {
    const thisMs = new Date(`${this.props.value}T00:00:00Z`).getTime();
    const otherMs = new Date(`${other.props.value}T00:00:00Z`).getTime();
    return Math.abs(Math.round((otherMs - thisMs) / ONE_DAY_MS));
  }

  /** The stored YYYY-MM-DD string. */
  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
