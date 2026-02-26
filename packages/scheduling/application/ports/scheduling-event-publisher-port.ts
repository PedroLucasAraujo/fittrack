import type { BookingCancelled } from '../../domain/events/booking-cancelled.js';
import type { BookingCancelledBySystem } from '../../domain/events/booking-cancelled-by-system.js';
import type { BookingCompleted } from '../../domain/events/booking-completed.js';
import type { BookingConfirmed } from '../../domain/events/booking-confirmed.js';
import type { BookingNoShow } from '../../domain/events/booking-no-show.js';
import type { RecurringScheduleCreated } from '../../domain/events/recurring-schedule-created.js';

/**
 * Event publisher port for the Scheduling bounded context.
 *
 * Every significant booking lifecycle transition emits its corresponding
 * domain event after the aggregate is persisted (ADR-0009 §4 post-commit
 * dispatch rule). The infrastructure adapter routes events to the
 * configured event bus / outbox table (ADR-0016).
 */
export interface ISchedulingEventPublisher {
  // ── Booking events ──────────────────────────────────────────────────────
  publishBookingConfirmed(event: BookingConfirmed): Promise<void>;
  publishBookingCancelled(event: BookingCancelled): Promise<void>;
  publishBookingCancelledBySystem(event: BookingCancelledBySystem): Promise<void>;
  publishBookingCompleted(event: BookingCompleted): Promise<void>;
  publishBookingNoShow(event: BookingNoShow): Promise<void>;

  // ── RecurringSchedule events ────────────────────────────────────────────
  publishRecurringScheduleCreated(event: RecurringScheduleCreated): Promise<void>;
}
