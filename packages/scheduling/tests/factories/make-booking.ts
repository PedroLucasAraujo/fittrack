import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { Booking } from '../../domain/aggregates/booking.js';
import { BookingStatus } from '../../domain/enums/booking-status.js';

type BookingOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  status: BookingStatus;
  scheduledAtUtc: UTCDateTime;
  logicalDay: LogicalDay;
  timezoneUsed: string;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancelledAtUtc: UTCDateTime | null;
  completedAtUtc: UTCDateTime | null;
  executionId: string | null;
  version: number;
}>;

export function makeBooking(overrides: BookingOverrides = {}): Booking {
  const logicalDayResult = LogicalDay.create('2025-06-15');

  return Booking.reconstitute(
    overrides.id ?? generateId(),
    {
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      clientId: overrides.clientId ?? generateId(),
      sessionId: overrides.sessionId ?? generateId(),
      status: overrides.status ?? BookingStatus.PENDING,
      scheduledAtUtc: overrides.scheduledAtUtc ?? UTCDateTime.now(),
      logicalDay: overrides.logicalDay ?? (logicalDayResult.value as LogicalDay),
      timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
      cancelledBy: overrides.cancelledBy ?? null,
      cancellationReason: overrides.cancellationReason ?? null,
      cancelledAtUtc: overrides.cancelledAtUtc ?? null,
      completedAtUtc: overrides.completedAtUtc ?? null,
      executionId: overrides.executionId ?? null,
      createdAtUtc: UTCDateTime.now(),
    },
    overrides.version ?? 0,
  );
}

export function makeNewBooking(
  overrides: Partial<{
    id: string;
    professionalProfileId: string;
    clientId: string;
    sessionId: string;
    timezoneUsed: string;
  }> = {},
): Booking {
  const logicalDayResult = LogicalDay.create('2025-06-15');

  const result = Booking.create({
    id: overrides.id ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    clientId: overrides.clientId ?? generateId(),
    sessionId: overrides.sessionId ?? generateId(),
    scheduledAtUtc: UTCDateTime.now(),
    logicalDay: logicalDayResult.value as LogicalDay,
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
  });

  if (result.isLeft()) {
    throw new Error(`makeNewBooking failed: ${result.value.message}`);
  }

  return result.value;
}
