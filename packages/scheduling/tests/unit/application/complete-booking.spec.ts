import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { CompleteBooking } from '../../../application/use-cases/complete-booking.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { InMemorySchedulingEventPublisherStub } from '../../stubs/in-memory-scheduling-event-publisher-stub.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeBooking } from '../../factories/make-booking.js';

describe('CompleteBooking', () => {
  let bookingRepository: InMemoryBookingRepository;
  let eventPublisher: InMemorySchedulingEventPublisherStub;
  let sut: CompleteBooking;
  let professionalProfileId: string;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    eventPublisher = new InMemorySchedulingEventPublisherStub();
    sut = new CompleteBooking(bookingRepository, eventPublisher);
    professionalProfileId = generateId();
  });

  it('completes a CONFIRMED booking successfully', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.CONFIRMED });
    bookingRepository.items.push(booking);
    const executionId = generateId();

    const result = await sut.execute({ bookingId: booking.id, professionalProfileId, executionId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.bookingId).toBe(booking.id);
      expect(result.value.status).toBe(BookingStatus.COMPLETED);
      expect(result.value.executionId).toBe(executionId);
      expect(result.value.completedAtUtc).toBeDefined();
    }
  });

  it('returns error for invalid booking UUID', async () => {
    const result = await sut.execute({
      bookingId: 'not-a-uuid',
      professionalProfileId,
      executionId: generateId(),
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
      executionId: generateId(),
    });

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

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      executionId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  it('rejects completion of a PENDING booking (must be CONFIRMED first)', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.PENDING });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      executionId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
    }
  });

  it('publishes BookingCompleted event on success', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.CONFIRMED });
    bookingRepository.items.push(booking);
    const executionId = generateId();

    await sut.execute({ bookingId: booking.id, professionalProfileId, executionId });

    expect(eventPublisher.publishedBookingCompleted).toHaveLength(1);
    expect(eventPublisher.publishedBookingCompleted[0]?.aggregateId).toBe(booking.id);
    expect(eventPublisher.publishedBookingCompleted[0]?.payload.executionId).toBe(executionId);
  });

  it('does not publish event when booking not found', async () => {
    await sut.execute({
      bookingId: generateId(),
      professionalProfileId,
      executionId: generateId(),
    });

    expect(eventPublisher.publishedBookingCompleted).toHaveLength(0);
  });

  it('does not publish event when transition is invalid', async () => {
    const booking = makeBooking({ professionalProfileId, status: BookingStatus.PENDING });
    bookingRepository.items.push(booking);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      executionId: generateId(),
    });

    expect(eventPublisher.publishedBookingCompleted).toHaveLength(0);
  });
});
