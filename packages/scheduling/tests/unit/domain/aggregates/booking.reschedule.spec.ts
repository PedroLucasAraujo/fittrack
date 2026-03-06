import { describe, it, expect } from 'vitest';
import { UTCDateTime, LogicalDay } from '@fittrack/core';
import { BookingStatus } from '../../../../domain/enums/booking-status.js';
import { ReschedulingPolicy } from '../../../../domain/value-objects/rescheduling-policy.js';
import { SchedulingErrorCodes } from '../../../../domain/errors/scheduling-error-codes.js';
import { makeBooking } from '../../../factories/make-booking.js';

/** Returns a UTCDateTime N hours in the future from now. */
function hoursFromNow(hours: number): UTCDateTime {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  return UTCDateTime.from(d).value as UTCDateTime;
}

/** Returns the LogicalDay for a UTCDateTime in the booking factory's default timezone. */
function logicalDayFor(dt: UTCDateTime): LogicalDay {
  return LogicalDay.fromDate(dt.value, 'America/Sao_Paulo');
}

describe('Booking.canBeRescheduled()', () => {
  const policy = ReschedulingPolicy.default(); // 24h notice, max 2

  it('allows rescheduling a PENDING booking within policy', () => {
    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: hoursFromNow(48),
      rescheduleCount: 0,
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isRight()).toBe(true);
  });

  it('allows rescheduling a CONFIRMED booking within policy', () => {
    const booking = makeBooking({
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: hoursFromNow(48),
      rescheduleCount: 1,
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isRight()).toBe(true);
  });

  it('rejects rescheduling a CANCELLED_BY_CLIENT booking', () => {
    const booking = makeBooking({
      status: BookingStatus.CANCELLED_BY_CLIENT,
      scheduledAtUtc: hoursFromNow(48),
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects rescheduling a CANCELLED_BY_PROFESSIONAL booking', () => {
    const booking = makeBooking({
      status: BookingStatus.CANCELLED_BY_PROFESSIONAL,
      scheduledAtUtc: hoursFromNow(48),
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects rescheduling a CANCELLED_BY_SYSTEM booking', () => {
    const booking = makeBooking({
      status: BookingStatus.CANCELLED_BY_SYSTEM,
      scheduledAtUtc: hoursFromNow(48),
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects rescheduling a COMPLETED booking', () => {
    const booking = makeBooking({
      status: BookingStatus.COMPLETED,
      scheduledAtUtc: hoursFromNow(48),
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects rescheduling a NO_SHOW booking', () => {
    const booking = makeBooking({
      status: BookingStatus.NO_SHOW,
      scheduledAtUtc: hoursFromNow(48),
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.BOOKING_CANNOT_BE_RESCHEDULED);
    }
  });

  it('rejects when rescheduleCount equals maxReschedules (2)', () => {
    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: hoursFromNow(48),
      rescheduleCount: 2,
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION);
    }
  });

  it('rejects when rescheduleCount exceeds maxReschedules', () => {
    const booking = makeBooking({
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: hoursFromNow(48),
      rescheduleCount: 3,
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION);
    }
  });

  it('rejects when booking starts in less than 24h (insufficient notice)', () => {
    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: hoursFromNow(12), // only 12h away
      rescheduleCount: 0,
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION);
    }
  });

  it('rejects when booking is in the past', () => {
    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: hoursFromNow(-1),
      rescheduleCount: 0,
    });

    const result = booking.canBeRescheduled(policy);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.RESCHEDULE_POLICY_VIOLATION);
    }
  });

  it('uses a custom policy (0h notice, 5 max)', () => {
    const customPolicy = ReschedulingPolicy.create(0, 5).value as ReschedulingPolicy;

    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: hoursFromNow(0.1), // only 6 minutes away
      rescheduleCount: 4,
    });

    const result = booking.canBeRescheduled(customPolicy);
    expect(result.isRight()).toBe(true);
  });
});

describe('Booking.reschedule()', () => {
  it('updates scheduledAtUtc, increments rescheduleCount, sets lastRescheduledAtUtc', () => {
    const originalScheduled = hoursFromNow(48);
    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: originalScheduled,
      rescheduleCount: 0,
      lastRescheduledAtUtc: null,
    });

    const newScheduledAtUtc = hoursFromNow(96);
    const newLogicalDay = logicalDayFor(newScheduledAtUtc);
    const beforeReschedule = Date.now();

    const result = booking.reschedule(newScheduledAtUtc, newLogicalDay);

    expect(result.isRight()).toBe(true);
    expect(booking.scheduledAtUtc.toISO()).toBe(newScheduledAtUtc.toISO());
    expect(booking.logicalDay.value).toBe(newLogicalDay.value);
    expect(booking.rescheduleCount).toBe(1);
    expect(booking.lastRescheduledAtUtc).not.toBeNull();
    expect(booking.lastRescheduledAtUtc!.value.getTime()).toBeGreaterThanOrEqual(beforeReschedule);
  });

  it('status remains PENDING after reschedule (ADR-0022: no RESCHEDULED state)', () => {
    const booking = makeBooking({
      status: BookingStatus.PENDING,
      scheduledAtUtc: hoursFromNow(48),
    });
    const newTime = hoursFromNow(96);
    booking.reschedule(newTime, logicalDayFor(newTime));

    expect(booking.status).toBe(BookingStatus.PENDING);
  });

  it('status remains CONFIRMED after reschedule (ADR-0022: no RESCHEDULED state)', () => {
    const booking = makeBooking({
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: hoursFromNow(48),
    });
    const newTime = hoursFromNow(96);
    booking.reschedule(newTime, logicalDayFor(newTime));

    expect(booking.status).toBe(BookingStatus.CONFIRMED);
  });

  it('increments rescheduleCount each time reschedule is called', () => {
    const booking = makeBooking({
      status: BookingStatus.CONFIRMED,
      scheduledAtUtc: hoursFromNow(48),
      rescheduleCount: 1,
    });
    const newTime = hoursFromNow(72);
    booking.reschedule(newTime, logicalDayFor(newTime));

    expect(booking.rescheduleCount).toBe(2);
  });
});

describe('Booking initial state', () => {
  it('new booking has rescheduleCount = 0', () => {
    const result = makeBooking({ rescheduleCount: 0 });
    expect(result.rescheduleCount).toBe(0);
  });

  it('new booking has lastRescheduledAtUtc = null', () => {
    const result = makeBooking({ lastRescheduledAtUtc: null });
    expect(result.lastRescheduledAtUtc).toBeNull();
  });
});
