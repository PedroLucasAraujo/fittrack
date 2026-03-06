import { BaseDomainEvent } from '@fittrack/core';

/**
 * Emitted after a Booking is successfully rescheduled to a new time.
 *
 * ## Consumers
 *
 * - Notification service: sends email/push to professional and client.
 * - Integration service: updates external calendars (Google Calendar, etc.).
 * - Analytics service: tracks rescheduling rate metrics.
 *
 * ## ADR compliance
 *
 * - ADR-0009: dispatched by the use case after save, never by the aggregate.
 * - ADR-0022: booking status remains unchanged (no RESCHEDULED terminal state).
 * - ADR-0037: payload contains only IDs and timestamps — no PII, no health data.
 */
export class BookingRescheduled extends BaseDomainEvent {
  readonly eventType = 'BookingRescheduled';
  readonly aggregateType = 'Booking';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      oldScheduledAtUtc: string;
      newScheduledAtUtc: string;
      rescheduledBy: string;
    }>,
  ) {
    super(1);
  }
}
