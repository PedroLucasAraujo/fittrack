import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, ErrorCodes, DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { RescheduleBooking } from '../../../application/use-cases/reschedule-booking.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { InMemorySchedulingEventPublisherStub } from '../../stubs/in-memory-scheduling-event-publisher-stub.js';
import { InMemoryAvailabilityQueryServiceStub } from '../../stubs/in-memory-availability-query-service-stub.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeBooking } from '../../factories/make-booking.js';

/** Returns an ISO UTC string N hours from now, at a business hour (10:00 UTC). */
function futureIso(hoursOffset: number = 48): string {
  const d = new Date();
  d.setUTCHours(10, 0, 0, 0); // lock to 10:00 UTC (business hours)
  d.setTime(d.getTime() + hoursOffset * 60 * 60 * 1000);
  return d.toISOString();
}

/** Returns a UTCDateTime for a booking's current scheduledAtUtc, 48h away. */
function futureUtc(hoursOffset: number = 48): UTCDateTime {
  const d = new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
  return UTCDateTime.from(d).value as UTCDateTime;
}

describe('RescheduleBooking', () => {
  let bookingRepository: InMemoryBookingRepository;
  let availabilityService: InMemoryAvailabilityQueryServiceStub;
  let eventPublisher: InMemorySchedulingEventPublisherStub;
  let sut: RescheduleBooking;
  let professionalProfileId: string;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    availabilityService = new InMemoryAvailabilityQueryServiceStub();
    eventPublisher = new InMemorySchedulingEventPublisherStub();
    sut = new RescheduleBooking(bookingRepository, availabilityService, eventPublisher);
    professionalProfileId = generateId();
  });

  // ── Success cases ─────────────────────────────────────────────────────────

  it('reschedules a PENDING booking successfully', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
      rescheduleCount: 0,
    });
    bookingRepository.items.push(booking);

    const newScheduledAtUtc = futureIso(72);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc,
      rescheduledBy: 'CLIENT',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.bookingId).toBe(booking.id);
      expect(result.value.status).toBe(BookingStatus.PENDING);
      expect(result.value.newScheduledAtUtc).toBe(newScheduledAtUtc);
      expect(result.value.rescheduleCount).toBe(1);
      expect(result.value.rescheduledBy).toBe('CLIENT');
      expect(result.value.rescheduledAtUtc).toBeDefined();
    }
  });

  it('reschedules a CONFIRMED booking successfully', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: futureUtc(48),
      rescheduleCount: 0,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'PROFESSIONAL',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(BookingStatus.CONFIRMED);
      expect(result.value.rescheduledBy).toBe('PROFESSIONAL');
    }
  });

  it('status remains unchanged after rescheduling (ADR-0022 — no RESCHEDULED state)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    const saved = bookingRepository.items.find((b) => b.id === booking.id);
    expect(saved?.status).toBe(BookingStatus.CONFIRMED);
    expect(saved?.rescheduleCount).toBe(1);
  });

  it('records oldScheduledAtUtc in output', async () => {
    const originalScheduled = futureUtc(48);
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: originalScheduled,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(96),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.oldScheduledAtUtc).toBe(originalScheduled.toISO());
    }
  });

  // ── Event dispatch (ADR-0009) ─────────────────────────────────────────────

  it('publishes BookingRescheduled event after successful reschedule (ADR-0009)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(eventPublisher.publishedBookingRescheduled).toHaveLength(1);
    const event = eventPublisher.publishedBookingRescheduled[0]!;
    expect(event.aggregateId).toBe(booking.id);
    expect(event.tenantId).toBe(professionalProfileId);
    expect(event.payload.rescheduledBy).toBe('CLIENT');
    expect(event.payload.newScheduledAtUtc).toBeDefined();
    expect(event.payload.oldScheduledAtUtc).toBeDefined();
  });

  it('does not publish event when booking is not found', async () => {
    await sut.execute({
      bookingId: generateId(),
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(eventPublisher.publishedBookingRescheduled).toHaveLength(0);
  });

  // ── Failure — booking lookup ──────────────────────────────────────────────

  it('returns error for invalid booking UUID', async () => {
    const result = await sut.execute({
      bookingId: 'not-a-uuid',
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('returns 404 for booking not found', async () => {
    const result = await sut.execute({
      bookingId: generateId(),
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
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
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId, // requesting tenant
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_NOT_FOUND);
    }
  });

  // ── Failure — new time validation ─────────────────────────────────────────

  it('rejects new scheduled time in the past', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    const pastIso = new Date(Date.now() - 3600000).toISOString(); // 1h ago

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: pastIso,
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_SCHEDULED_TIME);
    }
  });

  it('rejects new scheduled time outside business hours (before 08:00 UTC)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    // Create a future date at 06:00 UTC (before business hours)
    const d = new Date();
    d.setUTCHours(6, 0, 0, 0);
    d.setTime(d.getTime() + 48 * 60 * 60 * 1000); // 48h from now at 06:00 UTC
    const earlyIso = d.toISOString();

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: earlyIso,
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_SCHEDULED_TIME);
    }
  });

  it('rejects new scheduled time outside business hours (at 22:00 UTC or later)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    // 22:00 UTC — exactly at the boundary (exclusive end)
    const d = new Date();
    d.setUTCHours(22, 0, 0, 0);
    d.setTime(d.getTime() + 48 * 60 * 60 * 1000);
    const lateIso = d.toISOString();

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: lateIso,
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_SCHEDULED_TIME);
    }
  });

  // ── Failure — policy violations ───────────────────────────────────────────

  it('rejects when booking status is terminal (CANCELLED_BY_CLIENT)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CANCELLED_BY_CLIENT,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects when booking status is COMPLETED', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.COMPLETED,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'PROFESSIONAL',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects when reschedule limit (2) has been reached', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: futureUtc(48),
      rescheduleCount: 2, // default max is 2
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION);
    }
  });

  it('rejects when booking is within the minimum notice period (< 24h away)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: futureUtc(12), // only 12h away
      rescheduleCount: 0,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'PROFESSIONAL',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION);
    }
  });

  // ── Failure — schedule conflict ───────────────────────────────────────────

  it('rejects when professional is not available at the new time', async () => {
    availabilityService.shouldBeAvailable = false;

    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
      rescheduleCount: 0,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SCHEDULE_CONFLICT);
    }
  });

  // ── Availability service interaction ──────────────────────────────────────

  it('calls availability service with correct arguments', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    const newScheduledAtUtc = futureIso(72);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc,
      rescheduledBy: 'CLIENT',
    });

    expect(availabilityService.calls).toHaveLength(1);
    const call = availabilityService.calls[0]!;
    expect(call.professionalProfileId).toBe(professionalProfileId);
    expect(call.excludeBookingId).toBe(booking.id);
    expect(call.newScheduledAtUtc.toISO()).toBe(newScheduledAtUtc);
  });

  it('rejects when newScheduledAtUtc is not a valid ISO UTC string (no Z suffix)', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: '2025-06-15T10:00:00', // missing Z — invalid for UTCDateTime
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.TEMPORAL_VIOLATION);
    }
  });

  it('propagates error when availability service returns Left (infrastructure error)', async () => {
    const serviceError = new DomainError(
      'Availability service unavailable',
      'SCHEDULING.SCHEDULE_CONFLICT' as ErrorCode,
    );
    availabilityService.errorToThrow = serviceError;

    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.PENDING,
      scheduledAtUtc: futureUtc(48),
      rescheduleCount: 0,
    });
    bookingRepository.items.push(booking);

    const result = await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value).toBe(serviceError);
    }
  });

  it('does not call availability service when policy validation fails', async () => {
    const booking = makeBooking({
      professionalProfileId,
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: futureUtc(48),
      rescheduleCount: 2, // policy: max = 2 → already exceeded
    });
    bookingRepository.items.push(booking);

    await sut.execute({
      bookingId: booking.id,
      professionalProfileId,
      newScheduledAtUtc: futureIso(72),
      rescheduledBy: 'CLIENT',
    });

    expect(availabilityService.calls).toHaveLength(0);
  });
});
