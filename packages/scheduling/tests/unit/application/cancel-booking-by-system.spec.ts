import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { CancelBookingBySystem } from '../../../application/use-cases/cancel-booking-by-system.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { InMemorySchedulingEventPublisherStub } from '../../stubs/in-memory-scheduling-event-publisher-stub.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeBooking } from '../../factories/make-booking.js';

describe('CancelBookingBySystem', () => {
  let bookingRepository: InMemoryBookingRepository;
  let eventPublisher: InMemorySchedulingEventPublisherStub;
  let sut: CancelBookingBySystem;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    eventPublisher = new InMemorySchedulingEventPublisherStub();
    sut = new CancelBookingBySystem(bookingRepository, eventPublisher);
  });

  it('cancels a CONFIRMED booking by system', async () => {
    const booking = makeBooking({
      professionalProfileId: generateId(),
      status: BookingStatus.CONFIRMED,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      reason: 'AccessGrant revoked',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.bookingId).toBe(booking.id);
      expect(result.value.status).toBe(BookingStatus.CANCELLED_BY_SYSTEM);
      expect(result.value.cancelledAtUtc).toBeDefined();
    }
  });

  it('returns error for invalid booking UUID', async () => {
    const result = await sut.execute({ bookingId: 'not-a-uuid', reason: 'Test' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('returns error when booking not found', async () => {
    const result = await sut.execute({ bookingId: generateId(), reason: 'Test' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  it('rejects cancellation of a PENDING booking (must be CONFIRMED)', async () => {
    const booking = makeBooking({
      professionalProfileId: generateId(),
      status: BookingStatus.PENDING,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, reason: 'Test' });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
    }
  });

  it('publishes BookingCancelledBySystem event on success', async () => {
    const booking = makeBooking({
      professionalProfileId: generateId(),
      status: BookingStatus.CONFIRMED,
    });
    bookingRepository.items.push(booking);

    await sut.execute({ bookingId: booking.id, reason: 'AccessGrant revoked' });

    expect(eventPublisher.publishedBookingCancelledBySystem).toHaveLength(1);
    expect(eventPublisher.publishedBookingCancelledBySystem[0]?.aggregateId).toBe(booking.id);
    expect(eventPublisher.publishedBookingCancelledBySystem[0]?.payload.reason).toBe(
      'AccessGrant revoked',
    );
  });

  it('does not publish event when booking not found', async () => {
    await sut.execute({ bookingId: generateId(), reason: 'Test' });

    expect(eventPublisher.publishedBookingCancelledBySystem).toHaveLength(0);
  });

  it('does not publish event when transition is invalid', async () => {
    const booking = makeBooking({
      professionalProfileId: generateId(),
      status: BookingStatus.PENDING,
    });
    bookingRepository.items.push(booking);

    await sut.execute({ bookingId: booking.id, reason: 'Test' });

    expect(eventPublisher.publishedBookingCancelledBySystem).toHaveLength(0);
  });
});
