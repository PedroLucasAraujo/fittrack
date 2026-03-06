import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidReschedulingPolicyError } from '../errors/invalid-rescheduling-policy-error.js';

interface ReschedulingPolicyProps {
  minNoticeHours: number;
  maxReschedules: number;
}

/**
 * Encapsulates the configurable rules for when a Booking may be rescheduled.
 *
 * ## Constraints
 *
 * - `minNoticeHours`: minimum hours before the scheduled time that a reschedule
 *   is allowed. Range: [0, 168] (up to 1 week).
 * - `maxReschedules`: maximum number of times a booking may be rescheduled.
 *   Range: [0, 10].
 *
 * ## MVP note
 *
 * Policy is global (same for all bookings). Per-professional and per-plan
 * customisation is deferred to post-MVP (see TODO-RESCHEDULING-POST-MVP.md).
 */
export class ReschedulingPolicy extends ValueObject<ReschedulingPolicyProps> {
  static readonly DEFAULT_MIN_NOTICE_HOURS = 24;
  static readonly DEFAULT_MAX_RESCHEDULES = 2;

  private static readonly MAX_NOTICE_HOURS = 168; // 1 week
  private static readonly MAX_RESCHEDULE_LIMIT = 10;

  private constructor(props: ReschedulingPolicyProps) {
    super(props);
  }

  static create(minNoticeHours: number, maxReschedules: number): DomainResult<ReschedulingPolicy> {
    if (
      !Number.isInteger(minNoticeHours) ||
      minNoticeHours < 0 ||
      minNoticeHours > ReschedulingPolicy.MAX_NOTICE_HOURS
    ) {
      return left(
        new InvalidReschedulingPolicyError(
          `minNoticeHours must be an integer between 0 and ${ReschedulingPolicy.MAX_NOTICE_HOURS}. Received: ${minNoticeHours}`,
        ),
      );
    }

    if (
      !Number.isInteger(maxReschedules) ||
      maxReschedules < 0 ||
      maxReschedules > ReschedulingPolicy.MAX_RESCHEDULE_LIMIT
    ) {
      return left(
        new InvalidReschedulingPolicyError(
          `maxReschedules must be an integer between 0 and ${ReschedulingPolicy.MAX_RESCHEDULE_LIMIT}. Received: ${maxReschedules}`,
        ),
      );
    }

    return right(new ReschedulingPolicy({ minNoticeHours, maxReschedules }));
  }

  /** Returns the platform-wide default policy (24h notice, max 2 reschedules). */
  static default(): ReschedulingPolicy {
    return new ReschedulingPolicy({
      minNoticeHours: ReschedulingPolicy.DEFAULT_MIN_NOTICE_HOURS,
      maxReschedules: ReschedulingPolicy.DEFAULT_MAX_RESCHEDULES,
    });
  }

  get minNoticeHours(): number {
    return this.props.minNoticeHours;
  }

  get maxReschedules(): number {
    return this.props.maxReschedules;
  }
}
