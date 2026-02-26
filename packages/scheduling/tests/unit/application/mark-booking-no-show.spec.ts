import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { MarkBookingNoShow } from '../../../application/use-cases/mark-booking-no-show.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { InMemorySchedulingEventPublisherStub } from '../../stubs/in-memory-scheduling-event-publisher-stub.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeBooking } from '../../factories/make-booking.js';

describe('MarkBookingNoShow', () => {
  let bookingRepository: InMemoryBookingRepository;
  let eventPublisher: InMemorySchedulingEventPublisherStub;
  let sut: MarkBookingNoShow;
  let professionalProfileId: string;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    eventPublisher = new InMemorySchedulingEventPublisherStub();
    sut = new MarkBookingNoShow(bookingRepository, eventPublisher);
    professionalProfileId = generateId();
  });

  it('marks a CONFIRMED booking as NO_SHOW', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.CONFIRMED });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.bookingId).toBe(booking.id);
      expect(result.value.status).toBe(BookingStatus.NO_SHOW);
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
      status: BookingStatus.CONFIRMED,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  it('rejects no-show on a PENDING booking (must be CONFIRMED first)', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.PENDING });
    bookingRepository.items.push(booking);

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
    }
  });

  it('publishes BookingNoShow event on success', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.CONFIRMED });
    bookingRepository.items.push(booking);

    await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(eventPublisher.publishedBookingNoShow).toHaveLength(1);
    expect(eventPublisher.publishedBookingNoShow[0]?.aggregateId).toBe(booking.id);
  });

  it('does not publish event when booking not found', async () => {
    await sut.execute({ bookingId: generateId(), professionalProfileId });

    expect(eventPublisher.publishedBookingNoShow).toHaveLength(0);
  });

  it('does not publish event when transition is invalid', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.PENDING });
    bookingRepository.items.push(booking);

    await sut.execute({ bookingId: booking.id, professionalProfileId });

    expect(eventPublisher.publishedBookingNoShow).toHaveLength(0);
  });
});
