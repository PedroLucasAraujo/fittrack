import { BaseEntity, UTCDateTime, LogicalDay } from '@fittrack/core';

export interface RecurringSessionProps {
  logicalDay: LogicalDay;
  scheduledAtUtc: UTCDateTime;
  timezoneUsed: string;
  bookingId: string | null;
}

/**
 * RecurringSession — subordinate entity of RecurringSchedule (ADR-0047).
 *
 * Each instance represents a single generated occurrence in a recurring pattern.
 * Not accessible by ID from outside the aggregate boundary.
 *
 * `bookingId` is null until a Booking is created for this occurrence.
 * Once a bookingId is assigned it is never changed (cross-aggregate ref by ID).
 */
export class RecurringSession extends BaseEntity<RecurringSessionProps> {
  private constructor(id: string, props: RecurringSessionProps) {
    super(id, props);
  }

  static create(id: string, props: RecurringSessionProps): RecurringSession {
    return new RecurringSession(id, props);
  }

  /** Associates a Booking with this occurrence. */
  assignBooking(bookingId: string): void {
    this.props.bookingId = bookingId;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get logicalDay(): LogicalDay {
    return this.props.logicalDay;
  }

  get scheduledAtUtc(): UTCDateTime {
    return this.props.scheduledAtUtc;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }

  get bookingId(): string | null {
    return this.props.bookingId;
  }
}
