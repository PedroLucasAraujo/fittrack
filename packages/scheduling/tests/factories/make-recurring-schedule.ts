import { generateId, UTCDateTime } from '@fittrack/core';
import { RecurringSchedule } from '../../domain/aggregates/recurring-schedule.js';
import { DayOfWeek } from '../../domain/enums/day-of-week.js';

type RecurringScheduleOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  timezoneUsed: string;
  version: number;
}>;

export function makeRecurringSchedule(
  overrides: RecurringScheduleOverrides = {},
): RecurringSchedule {
  return RecurringSchedule.reconstitute(
    overrides.id ?? generateId(),
    {
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      clientId: overrides.clientId ?? generateId(),
      sessionId: overrides.sessionId ?? generateId(),
      dayOfWeek: overrides.dayOfWeek ?? DayOfWeek.MONDAY,
      startTime: overrides.startTime ?? '09:00',
      timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
      sessions: [],
      createdAtUtc: UTCDateTime.now(),
    },
    overrides.version ?? 0,
  );
}
