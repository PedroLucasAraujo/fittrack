import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { ConfirmBooking } from '../../../application/use-cases/confirm-booking.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { InMemorySchedulingEventPublisherStub } from '../../stubs/in-memory-scheduling-event-publisher-stub.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeBooking } from '../../factories/make-booking.js';

describe('ConfirmBooking', () => {
  let bookingRepository: InMemoryBookingRepository;
  let eventPublisher: InMemorySchedulingEventPublisherStub;
  let sut: ConfirmBooking;
  let professionalProfileId: string;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    eventPublisher = new InMemorySchedulingEventPublisherStub();
    sut = new ConfirmBooking(bookingRepository, eventPublisher);
    professionalProfileId = generateId();
  });

  it('confirms a PENDING booking successfully', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.PENDING });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.bookingId).toBe(booking.id);
      expect(result.value.status).toBe(BookingStatus.CONFIRMED);
    }
  });

  it('returns error for invalid booking UUID', async () => {
    const result = await sut.execute({ bookingId: 'not-a-uuid', professionalProfileId });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('returns error when booking not found', async () => {
    const result = await sut.execute({ bookingId: generateId(), professionalProfileId });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  it('returns 404 for cross-tenant access (ADR-0025)', async () => {
    const booking = makeBooking({
      professionalProfileId: generateId(), // different tenant
      status: BookingStatus.PENDING,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  it('rejects confirmation of an already CONFIRMED booking', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.CONFIRMED });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
    }
  });

  it('publishes BookingConfirmed event on success', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.PENDING });
    bookingRepository.items.push(booking);

    await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(eventPublisher.publishedBookingConfirmed).toHaveLength(1);
    expect(eventPublisher.publishedBookingConfirmed[0]?.aggregateId).toBe(booking.id);
    expect(eventPublisher.publishedBookingConfirmed[0]?.payload.professionalProfileId).toBe(
      professionalProfileId,
    );
  });

  it('does not publish event when booking not found', async () => {
    await sut.execute({ bookingId: generateId(), professionalProfileId });

    expect(eventPublisher.publishedBookingConfirmed).toHaveLength(0);
  });

  it('does not publish event when transition is invalid', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.CONFIRMED });
    bookingRepository.items.push(booking);

    await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(eventPublisher.publishedBookingConfirmed).toHaveLength(0);
  });
});
