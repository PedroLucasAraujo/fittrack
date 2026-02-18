import type { IRepository } from '@fittrack/core';
import type { UniqueEntityId } from '@fittrack/core';
import type { Booking } from '../aggregates/booking.js';

/**
 * Repository interface for the Booking aggregate root (ADR-0004).
 *
 * All queries include `professionalProfileId` for tenant isolation (ADR-0025).
 * No hard delete method — Booking is Tier 2 retained (ADR-0013).
 */
export interface IBookingRepository extends IRepository<Booking> {
  /**
   * Counts open bookings (PENDING | CONFIRMED) for a client within a
   * professional's scope. Used to enforce the open-bookings-per-client
   * hard limit (ADR-0041).
   */
  countOpenByClientId(clientId: string, professionalProfileId: string): Promise<number>;

  /**
   * Checks if an active booking (PENDING | CONFIRMED) already exists for
   * the given session on the given logical day. Used for double-booking
   * prevention (ADR-0006, domain layer).
   */
  existsActiveForSessionOnDay(
    sessionId: string,
    logicalDay: string,
    professionalProfileId: string,
  ): Promise<boolean>;

  /**
   * Finds a booking by ID scoped to a professional profile (ADR-0025).
   * Returns null if not found or if the booking belongs to a different tenant.
   */
  findByIdAndProfessionalProfileId(
    id: UniqueEntityId,
    professionalProfileId: string,
  ): Promise<Booking | null>;
}
