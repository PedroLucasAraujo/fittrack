import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, ErrorCodes } from '@fittrack/core';
import { CreateRecurringSchedule } from '../../../application/use-cases/create-recurring-schedule.js';
import { InMemoryRecurringScheduleRepository } from '../../repositories/in-memory-recurring-schedule-repository.js';
import { InMemorySessionRepository } from '../../repositories/in-memory-session-repository.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { RecurringScheduleNotFoundError } from '../../../domain/errors/recurring-schedule-not-found-error.js';
import { DayOfWeek } from '../../../domain/enums/day-of-week.js';
import { makeSession } from '../../factories/make-session.js';
import { SessionStatus } from '../../../domain/enums/session-status.js';

describe('CreateRecurringSchedule', () => {
  let recurringScheduleRepository: InMemoryRecurringScheduleRepository;
  let sessionRepository: InMemorySessionRepository;
  let sut: CreateRecurringSchedule;
  let professionalProfileId: string;
  let session: ReturnType<typeof makeSession>;

  beforeEach(() => {
    recurringScheduleRepository = new InMemoryRecurringScheduleRepository();
    sessionRepository = new InMemorySessionRepository();
    sut = new CreateRecurringSchedule(recurringScheduleRepository, sessionRepository);

    professionalProfileId = generateId();
    session = makeSession({
      professionalProfileId,
      status: SessionStatus.ACTIVE,
    });
    sessionRepository.items.push(session);
  });

  it('creates a recurring schedule with generated sessions', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.sessionCount).toBe(4);
      expect(result.value.dayOfWeek).toBe(DayOfWeek.MONDAY);
      expect(result.value.startTime).toBe('09:00');
    }
    expect(recurringScheduleRepository.items).toHaveLength(1);
  });

  it('blocks creation when professional is banned (ADR-0022)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: true, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.PROFESSIONAL_BANNED);
    }
  });

  it('enforces WATCHLIST limit of 12 sessions (ADR-0022)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startTime: '10:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 13, // exceeds WATCHLIST limit of 12
      },
      { isBanned: false, isWatchlist: true },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.OPERATIONAL_LIMIT_EXCEEDED);
    }
  });

  it('allows WATCHLIST professional up to 12 sessions', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startTime: '10:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 12,
      },
      { isBanned: false, isWatchlist: true },
    );

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.sessionCount).toBe(12);
    }
  });

  it('enforces max 52 sessions for normal professionals (ADR-0041)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '08:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 53, // exceeds limit
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.OPERATIONAL_LIMIT_EXCEEDED);
    }
  });

  it('rejects zero recurrence count', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 0,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.OPERATIONAL_LIMIT_EXCEEDED);
    }
  });

  it('rejects non-integer recurrence count', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4.5,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid dayOfWeek', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: 99,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid session UUID', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: 'not-a-uuid',
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_UUID);
    }
  });

  it('returns error when session not found', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: generateId(), // non-existent
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SESSION_NOT_FOUND);
    }
  });

  it('returns error when session belongs to different tenant (ADR-0025)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId: generateId(), // different tenant
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SESSION_NOT_FOUND);
    }
  });

  it('creates recurring schedule for SUNDAY (DayOfWeek.SUNDAY branch)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        dayOfWeek: DayOfWeek.SUNDAY,
        startTime: '10:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 2,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.sessionCount).toBe(2);
      expect(result.value.dayOfWeek).toBe(DayOfWeek.SUNDAY);
    }
  });

  it('RecurringScheduleNotFoundError carries correct code', () => {
    const error = new RecurringScheduleNotFoundError(generateId());
    expect(error.code).toBe(SchedulingErrorCodes.RECURRING_SCHEDULE_NOT_FOUND);
  });

  it('returns error when session is archived', async () => {
    const archivedSession = makeSession({
      professionalProfileId,
      status: SessionStatus.ARCHIVED,
    });
    sessionRepository.items.push(archivedSession);

    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: archivedSession.id,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
        recurrenceCount: 4,
      },
      { isBanned: false, isWatchlist: false },
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SESSION_NOT_ACTIVE);
    }
  });
});
