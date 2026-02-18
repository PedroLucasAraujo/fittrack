import { describe, it, expect } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { DayOfWeek } from '../../../domain/enums/day-of-week.js';
import { RecurringSchedule } from '../../../domain/aggregates/recurring-schedule.js';
import { makeRecurringSchedule } from '../../factories/make-recurring-schedule.js';

describe('RecurringSchedule', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with empty sessions list', () => {
      const result = RecurringSchedule.create({
        professionalProfileId: generateId(),
        clientId: generateId(),
        sessionId: generateId(),
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        timezoneUsed: 'America/Sao_Paulo',
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.sessionCount).toBe(0);
        expect(result.value.sessions).toHaveLength(0);
      }
    });

    it('does not emit domain events', () => {
      const result = RecurringSchedule.create({
        professionalProfileId: generateId(),
        clientId: generateId(),
        sessionId: generateId(),
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startTime: '10:00',
        timezoneUsed: 'UTC',
      });

      if (result.isRight()) {
        expect(result.value.getDomainEvents()).toHaveLength(0);
      }
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const schedule = makeRecurringSchedule();
      expect(schedule.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const schedule = makeRecurringSchedule({ version: 2 });
      expect(schedule.version).toBe(2);
    });
  });

  // ── addSession ────────────────────────────────────────────────────────────

  describe('addSession()', () => {
    it('adds a recurring session occurrence', () => {
      const schedule = makeRecurringSchedule();
      const logicalDay = LogicalDay.create('2025-07-01').value as LogicalDay;

      schedule.addSession({
        logicalDay,
        scheduledAtUtc: UTCDateTime.now(),
        timezoneUsed: 'America/Sao_Paulo',
        bookingId: null,
      });

      expect(schedule.sessionCount).toBe(1);
      expect(schedule.sessions[0]!.logicalDay.value).toBe('2025-07-01');
      expect(schedule.sessions[0]!.bookingId).toBeNull();
    });

    it('increments session count with each addition', () => {
      const schedule = makeRecurringSchedule();

      for (let i = 0; i < 5; i++) {
        const logicalDay = LogicalDay.create(`2025-07-0${i + 1}`).value as LogicalDay;
        schedule.addSession({
          logicalDay,
          scheduledAtUtc: UTCDateTime.now(),
          timezoneUsed: 'America/Sao_Paulo',
          bookingId: null,
        });
      }

      expect(schedule.sessionCount).toBe(5);
      expect(schedule.unassignedSessionCount).toBe(5);
    });

    it('returns the created session with all getters accessible', () => {
      const schedule = makeRecurringSchedule();
      const logicalDay = LogicalDay.create('2025-07-01').value as LogicalDay;
      const scheduledAtUtc = UTCDateTime.now();

      const session = schedule.addSession({
        logicalDay,
        scheduledAtUtc,
        timezoneUsed: 'America/Sao_Paulo',
        bookingId: null,
      });

      expect(session.id).toBeDefined();
      expect(session.logicalDay.value).toBe('2025-07-01');
      expect(session.scheduledAtUtc).toBeDefined();
      expect(session.timezoneUsed).toBe('America/Sao_Paulo');
      expect(session.bookingId).toBeNull();
    });
  });

  // ── unassignedSessionCount ────────────────────────────────────────────────

  describe('unassignedSessionCount', () => {
    it('counts only sessions without bookingId', () => {
      const schedule = makeRecurringSchedule();
      const logicalDay1 = LogicalDay.create('2025-07-01').value as LogicalDay;
      const logicalDay2 = LogicalDay.create('2025-07-08').value as LogicalDay;

      const session1 = schedule.addSession({
        logicalDay: logicalDay1,
        scheduledAtUtc: UTCDateTime.now(),
        timezoneUsed: 'America/Sao_Paulo',
        bookingId: null,
      });

      schedule.addSession({
        logicalDay: logicalDay2,
        scheduledAtUtc: UTCDateTime.now(),
        timezoneUsed: 'America/Sao_Paulo',
        bookingId: null,
      });

      session1.assignBooking(generateId());

      expect(schedule.sessionCount).toBe(2);
      expect(schedule.unassignedSessionCount).toBe(1);
    });
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const profId = generateId();
      const clientId = generateId();
      const sessionId = generateId();

      const schedule = makeRecurringSchedule({
        professionalProfileId: profId,
        clientId,
        sessionId,
        dayOfWeek: DayOfWeek.THURSDAY,
        startTime: '14:00',
        timezoneUsed: 'Europe/Berlin',
      });

      expect(schedule.professionalProfileId).toBe(profId);
      expect(schedule.clientId).toBe(clientId);
      expect(schedule.sessionId).toBe(sessionId);
      expect(schedule.dayOfWeek).toBe(DayOfWeek.THURSDAY);
      expect(schedule.startTime).toBe('14:00');
      expect(schedule.timezoneUsed).toBe('Europe/Berlin');
      expect(schedule.createdAtUtc).toBeDefined();
    });
  });
});
