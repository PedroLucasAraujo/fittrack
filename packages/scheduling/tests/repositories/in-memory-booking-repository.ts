import type { UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { Booking } from '../../domain/aggregates/booking.js';
import { BookingStatus } from '../../domain/enums/booking-status.js';

export class InMemoryBookingRepository implements IBookingRepository {
  items: Booking[] = [];

  async findById(id: UniqueEntityId): Promise<Booking | null> {
    return this.items.find((b) => b.id === id.value) ?? null;
  }

  async save(entity: Booking): Promise<void> {
    const index = this.items.findIndex((b) => b.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }

  async countOpenByClientId(clientId: string, professionalProfileId: string): Promise<number> {
    return this.items.filter(
      (b) =>
        b.clientId === clientId &&
        b.professionalProfileId === professionalProfileId &&
        (b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED),
    ).length;
  }

  async existsActiveForSessionOnDay(
    sessionId: string,
    logicalDay: string,
    professionalProfileId: string,
  ): Promise<boolean> {
    return this.items.some(
      (b) =>
        b.sessionId === sessionId &&
        b.logicalDay.value === logicalDay &&
        b.professionalProfileId === professionalProfileId &&
        (b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED),
    );
  }

  async findByIdAndProfessionalProfileId(
    id: UniqueEntityId,
    professionalProfileId: string,
  ): Promise<Booking | null> {
    return (
      this.items.find(
        (b) => b.id === id.value && b.professionalProfileId === professionalProfileId,
      ) ?? null
    );
  }

  async findConflictingBookings(
    professionalProfileId: string,
    startUtc: UTCDateTime,
    endUtc: UTCDateTime,
    excludeBookingId?: string,
  ): Promise<Booking[]> {
    const startMs = startUtc.value.getTime();
    const endMs = endUtc.value.getTime();

    return this.items.filter((b) => {
      if (b.professionalProfileId !== professionalProfileId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.status !== BookingStatus.PENDING && b.status !== BookingStatus.CONFIRMED) return false;

      // Check if booking start falls within [startMs, endMs)
      const bookingStartMs = b.scheduledAtUtc.value.getTime();
      return bookingStartMs >= startMs && bookingStartMs < endMs;
    });
  }
}
