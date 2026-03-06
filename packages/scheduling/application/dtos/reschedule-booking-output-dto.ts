import type { BookingStatus } from '../../domain/enums/booking-status.js';

export interface RescheduleBookingOutputDTO {
  bookingId: string;
  /** Status remains unchanged after rescheduling (ADR-0022 — no RESCHEDULED state). */
  status: BookingStatus;
  oldScheduledAtUtc: string;
  newScheduledAtUtc: string;
  rescheduledBy: string;
  rescheduleCount: number;
  rescheduledAtUtc: string;
}
