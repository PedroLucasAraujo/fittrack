import { generateId, UTCDateTime } from '@fittrack/core';
import { Session } from '../../domain/aggregates/session.js';
import { SessionTitle } from '../../domain/value-objects/session-title.js';
import { DurationMinutes } from '../../domain/value-objects/duration-minutes.js';
import { SessionStatus } from '../../domain/enums/session-status.js';

type SessionOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  title: SessionTitle;
  durationMinutes: DurationMinutes;
  status: SessionStatus;
  version: number;
  archivedAtUtc: UTCDateTime | null;
}>;

export function makeSession(overrides: SessionOverrides = {}): Session {
  const titleResult = SessionTitle.create('Personal Training');
  const durationResult = DurationMinutes.create(60);

  return Session.reconstitute(
    overrides.id ?? generateId(),
    {
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      title: overrides.title ?? (titleResult.value as SessionTitle),
      durationMinutes: overrides.durationMinutes ?? (durationResult.value as DurationMinutes),
      status: overrides.status ?? SessionStatus.ACTIVE,
      createdAtUtc: UTCDateTime.now(),
      archivedAtUtc: overrides.archivedAtUtc ?? null,
    },
    overrides.version ?? 0,
  );
}

export function makeNewSession(
  overrides: Partial<{
    id: string;
    professionalProfileId: string;
    title: SessionTitle;
    durationMinutes: DurationMinutes;
  }> = {},
): Session {
  const titleResult = SessionTitle.create('Personal Training');
  const durationResult = DurationMinutes.create(60);

  const result = Session.create({
    id: overrides.id ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    title: overrides.title ?? (titleResult.value as SessionTitle),
    durationMinutes: overrides.durationMinutes ?? (durationResult.value as DurationMinutes),
  });

  if (result.isLeft()) {
    throw new Error(`makeNewSession failed: ${result.value.message}`);
  }

  return result.value;
}
