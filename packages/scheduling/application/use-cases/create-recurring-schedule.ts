import {
  left,
  right,
  UniqueEntityId,
  UTCDateTime,
  LogicalDay,
  DomainInvariantError,
} from '@fittrack/core';
import type { DomainResult, ErrorCode } from '@fittrack/core';
import { DayOfWeek } from '../../domain/enums/day-of-week.js';
import { RecurringSchedule } from '../../domain/aggregates/recurring-schedule.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found-error.js';
import { SessionNotActiveError } from '../../domain/errors/session-not-active-error.js';
import { ProfessionalBannedError } from '../../domain/errors/professional-banned-error.js';
import { OperationalLimitExceededError } from '../../domain/errors/operational-limit-exceeded-error.js';
import { SchedulingErrorCodes } from '../../domain/errors/scheduling-error-codes.js';
import { RecurringScheduleCreated } from '../../domain/events/recurring-schedule-created.js';
import type { IRecurringScheduleRepository } from '../../domain/repositories/recurring-schedule-repository.js';
import type { ISessionRepository } from '../../domain/repositories/session-repository.js';
import type { ISchedulingEventPublisher } from '../ports/scheduling-event-publisher-port.js';
import type { CreateRecurringScheduleInputDTO } from '../dtos/create-recurring-schedule-input-dto.js';
import type { CreateRecurringScheduleOutputDTO } from '../dtos/create-recurring-schedule-output-dto.js';

export interface CreateRecurringScheduleLimits {
  maxRecurringSessions: number;
  watchlistMaxRecurringSessions: number;
}

/**
 * Creates a RecurringSchedule and generates its recurring sessions.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025).
 * 2. Banned state (ADR-0022): blocks all creation.
 * 3. Session must be ACTIVE.
 * 4. Recurrence count within hard limits (ADR-0041):
 *    - Normal: configurable max sessions.
 *    - WATCHLIST: configurable reduced limit.
 * 5. Temporal (ADR-0010): each generated session gets logicalDay from
 *    professional's timezone (recurring schedules use professional's TZ).
 */
export class CreateRecurringSchedule {
  constructor(
    private readonly recurringScheduleRepository: IRecurringScheduleRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly limits: CreateRecurringScheduleLimits,
    private readonly eventPublisher: ISchedulingEventPublisher,
  ) {}

  async execute(
    dto: CreateRecurringScheduleInputDTO,
    riskContext: { isBanned: boolean; isWatchlist: boolean },
  ): Promise<DomainResult<CreateRecurringScheduleOutputDTO>> {
    // 1. Banned state enforcement (ADR-0022)
    if (riskContext.isBanned) {
      return left(new ProfessionalBannedError(dto.professionalProfileId));
    }

    // 2. Validate dayOfWeek
    const dayOfWeek = dto.dayOfWeek as DayOfWeek;
    if (!Object.values(DayOfWeek).includes(dayOfWeek)) {
      return left(
        new DomainInvariantError(
          `Invalid day of week: ${dto.dayOfWeek}. Expected 1 (Monday) to 7 (Sunday).`,
          SchedulingErrorCodes.INVALID_RECURRENCE_COUNT as ErrorCode,
          { dayOfWeek: dto.dayOfWeek },
        ),
      );
    }

    // 3. Validate recurrence count (ADR-0041) — configurable, not hardcoded
    const maxSessions = riskContext.isWatchlist
      ? this.limits.watchlistMaxRecurringSessions
      : this.limits.maxRecurringSessions;

    if (
      !Number.isInteger(dto.recurrenceCount) ||
      dto.recurrenceCount < 1 ||
      dto.recurrenceCount > maxSessions
    ) {
      return left(
        new OperationalLimitExceededError(
          'MAX_RECURRING_SESSIONS_PER_SCHEDULE',
          dto.recurrenceCount,
          maxSessions,
        ),
      );
    }

    // 4. Validate session exists and is active
    const sessionIdResult = UniqueEntityId.create(dto.sessionId);
    if (sessionIdResult.isLeft()) return left(sessionIdResult.value);

    const session = await this.sessionRepository.findById(sessionIdResult.value);
    if (!session || session.professionalProfileId !== dto.professionalProfileId) {
      return left(new SessionNotFoundError(dto.sessionId));
    }

    if (!session.isActive()) {
      return left(new SessionNotActiveError(dto.sessionId));
    }

    // 5. Create recurring schedule
    const scheduleResult = RecurringSchedule.create({
      professionalProfileId: dto.professionalProfileId,
      clientId: dto.clientId,
      sessionId: dto.sessionId,
      dayOfWeek,
      startTime: dto.startTime,
      timezoneUsed: dto.timezoneUsed,
    });
    /* v8 ignore next */
    if (scheduleResult.isLeft()) return left(scheduleResult.value);

    const schedule = scheduleResult.value;

    // 6. Generate recurring session occurrences
    const baseDate = CreateRecurringSchedule.findNextDayOfWeek(dayOfWeek);

    for (let i = 0; i < dto.recurrenceCount; i++) {
      const sessionDate = new Date(baseDate.getTime());
      sessionDate.setDate(sessionDate.getDate() + i * 7);

      // Build UTC datetime from the session date + startTime in professional's TZ
      const dateParts = sessionDate.toISOString().split('T');
      /* v8 ignore next */
      const dateStr = dateParts[0] ?? '';
      const isoString = `${dateStr}T${dto.startTime}:00.000Z`;

      const scheduledAtUtcResult = UTCDateTime.fromISO(isoString);
      /* v8 ignore next */
      if (scheduledAtUtcResult.isLeft()) return left(scheduledAtUtcResult.value);

      const logicalDayResult = LogicalDay.fromDate(
        scheduledAtUtcResult.value.value,
        dto.timezoneUsed,
      );
      /* v8 ignore next */
      if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

      schedule.addSession({
        logicalDay: logicalDayResult.value,
        scheduledAtUtc: scheduledAtUtcResult.value,
        timezoneUsed: dto.timezoneUsed,
        bookingId: null,
      });
    }

    await this.recurringScheduleRepository.save(schedule);

    await this.eventPublisher.publishRecurringScheduleCreated(
      new RecurringScheduleCreated(schedule.id, schedule.professionalProfileId, {
        sessionId: schedule.sessionId,
        clientId: schedule.clientId,
        dayOfWeek: schedule.dayOfWeek,
        sessionCount: schedule.sessionCount,
      }),
    );

    return right({
      recurringScheduleId: schedule.id,
      professionalProfileId: schedule.professionalProfileId,
      clientId: schedule.clientId,
      sessionId: schedule.sessionId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      sessionCount: schedule.sessionCount,
      createdAtUtc: schedule.createdAtUtc.toISO(),
    });
  }

  /**
   * Finds the next occurrence of the given day of week from today (UTC).
   * If today is the target day, returns today.
   */
  private static findNextDayOfWeek(dayOfWeek: DayOfWeek): Date {
    const now = new Date();
    // JS: Sunday=0, Monday=1 ... Saturday=6
    // ISO: Monday=1 ... Sunday=7
    const jsDay = dayOfWeek === DayOfWeek.SUNDAY ? 0 : dayOfWeek;
    const currentDay = now.getUTCDay();
    const daysUntil = (jsDay - currentDay + 7) % 7;
    const target = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil),
    );
    return target;
  }
}
