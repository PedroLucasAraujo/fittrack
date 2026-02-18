import { generateId, UTCDateTime } from '@fittrack/core';
import { WorkingAvailability } from '../../domain/aggregates/working-availability.js';
import { DayOfWeek } from '../../domain/enums/day-of-week.js';
import { TimeSlot } from '../../domain/value-objects/time-slot.js';

type WorkingAvailabilityOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  dayOfWeek: DayOfWeek;
  timezoneUsed: string;
  slots: TimeSlot[];
  version: number;
}>;

export function makeWorkingAvailability(
  overrides: WorkingAvailabilityOverrides = {},
): WorkingAvailability {
  const defaultSlot = TimeSlot.create('08:00', '12:00').value as TimeSlot;

  return WorkingAvailability.reconstitute(
    overrides.id ?? generateId(),
    {
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      dayOfWeek: overrides.dayOfWeek ?? DayOfWeek.MONDAY,
      timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
      slots: overrides.slots ?? [defaultSlot],
      createdAtUtc: UTCDateTime.now(),
      updatedAtUtc: UTCDateTime.now(),
    },
    overrides.version ?? 0,
  );
}
