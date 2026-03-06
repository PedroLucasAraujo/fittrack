/* v8 ignore file — TypeScript interface: no executable runtime code. */
import type { UTCDateTime, DomainResult } from '@fittrack/core';

/**
 * Anti-corruption layer: checks whether a professional is available at a
 * given time without exposing `WorkingAvailability` or other aggregates
 * directly to the Booking domain (ADR-0009 §Aggregate Purity).
 *
 * The infrastructure implementation is responsible for consulting
 * `WorkingAvailability`, `RecurringSchedule`, and `Booking` repositories
 * to determine true availability.
 *
 * @param professionalProfileId — scoped to tenant (ADR-0025).
 * @param newScheduledAtUtc — the candidate UTC start time.
 * @param excludeBookingId — the booking being rescheduled; excluded from
 *   conflict detection to avoid self-collisions.
 */
export interface IAvailabilityQueryService {
  isProfessionalAvailable(
    professionalProfileId: string,
    newScheduledAtUtc: UTCDateTime,
    excludeBookingId: string,
  ): Promise<DomainResult<boolean>>;
}
