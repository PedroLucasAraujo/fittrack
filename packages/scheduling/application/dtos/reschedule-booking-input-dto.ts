export interface RescheduleBookingInputDTO {
  /** Booking to be rescheduled. */
  bookingId: string;
  /** Tenant scope — must match the booking's professionalProfileId (ADR-0025). */
  professionalProfileId: string;
  /** New UTC start time in ISO 8601 format ending with "Z". */
  newScheduledAtUtc: string;
  /** Actor performing the reschedule — for audit trail in the domain event. */
  rescheduledBy: 'CLIENT' | 'PROFESSIONAL';
}
