import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { CancelBooking } from '../../../application/use-cases/cancel-booking.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeBooking } from '../../factories/make-booking.js';
import { InMemorySchedulingEventPublisherStub } from '../../stubs/in-memory-scheduling-event-publisher-stub.js';

describe('CancelBooking', () => {
  let bookingRepository: InMemoryBookingRepository;
  let eventPublisher: InMemorySchedulingEventPublisherStub;
  let sut: CancelBooking;
  let professionalProfileId: string;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    eventPublisher = new InMemorySchedulingEventPublisherStub();
    sut = new CancelBooking(bookingRepository, eventPublisher);
    professionalProfileId = generateId();
  });

  it('cancels a PENDING booking by client', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Schedule conflict',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(BookingStatus.CANCELLED_BY_CLIENT);
      expect(result.value.cancelledBy).toBe('CLIENT');
      expect(result.value.cancellationReason).toBe('Schedule conflict');
      expect(result.value.cancelledAtUtc).toBeDefined();
    }
  });

  it('cancels a CONFIRMED booking by professional', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CONFIRMED,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      cancelledBy: 'PROFESSIONAL',
      reason: 'Emergency',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(BookingStatus.CANCELLED_BY_PROFESSIONAL);
      expect(result.value.cancelledBy).toBe('PROFESSIONAL');
    }
  });

  it('returns error for invalid booking UUID', async () => {
    const result = await sut.execute({
      bookingId: 'not-a-uuid',
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Test',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('returns error when booking not found', async () => {
    const result = await sut.execute({
      bookingId: generateId(),
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Test',
    });

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

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId, // requesting tenant
      cancelledBy: 'CLIENT',
      reason: 'Test',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  it('rejects cancellation of a COMPLETED booking (terminal state)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.COMPLETED,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Too late',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
    }
  });

  it('rejects cancellation of already cancelled booking', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CANCELLED_BY_CLIENT,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      cancelledBy: 'PROFESSIONAL',
      reason: 'Again',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('publishes BookingCancelled event on success', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
    });
    bookingRepository.items.push(booking);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Schedule conflict',
    });

    expect(eventPublisher.publishedBookingCancelled).toHaveLength(1);
    expect(eventPublisher.publishedBookingCancelled[0]?.aggregateId).toBe(booking.id);
  });

  it('does not publish event when booking not found', async () => {
    await sut.execute({
      bookingId: generateId(),
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Test',
    });

    expect(eventPublisher.publishedBookingCancelled).toHaveLength(0);
  });

  it('does not publish event when transition is invalid', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.COMPLETED,
    });
    bookingRepository.items.push(booking);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      cancelledBy: 'CLIENT',
      reason: 'Too late',
    });

    expect(eventPublisher.publishedBookingCancelled).toHaveLength(0);
  });
});
