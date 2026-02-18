import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { SessionStatus } from '../../../domain/enums/session-status.js';
import { SessionTitle } from '../../../domain/value-objects/session-title.js';
import { DurationMinutes } from '../../../domain/value-objects/duration-minutes.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { makeSession, makeNewSession } from '../../factories/make-session.js';

describe('Session', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with ACTIVE status', () => {
      const session = makeNewSession();

      expect(session.status).toBe(SessionStatus.ACTIVE);
      expect(session.archivedAtUtc).toBeNull();
      expect(session.isActive()).toBe(true);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const session = makeNewSession();
      expect(session.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const session = makeNewSession({ id });
      expect(session.id).toBe(id);
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const session = makeSession();
      expect(session.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const session = makeSession({ version: 5 });
      expect(session.version).toBe(5);
    });
  });

  // ── Archive ───────────────────────────────────────────────────────────────

  describe('archive()', () => {
    it('transitions ACTIVE → ARCHIVED', () => {
      const session = makeSession({ status: SessionStatus.ACTIVE });

      const result = session.archive();

      expect(result.isRight()).toBe(true);
      expect(session.status).toBe(SessionStatus.ARCHIVED);
      expect(session.archivedAtUtc).not.toBeNull();
      expect(session.isActive()).toBe(false);
    });

    it('does not emit domain events', () => {
      const session = makeSession({ status: SessionStatus.ACTIVE });
      session.archive();
      expect(session.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from ARCHIVED (already archived)', () => {
      const session = makeSession({ status: SessionStatus.ARCHIVED });

      const result = session.archive();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
      }
    });
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const profId = generateId();
      const title = SessionTitle.create('Yoga Class').value as SessionTitle;
      const duration = DurationMinutes.create(45).value as DurationMinutes;

      const session = makeSession({
        professionalProfileId: profId,
        title,
        durationMinutes: duration,
        status: SessionStatus.ACTIVE,
      });

      expect(session.professionalProfileId).toBe(profId);
      expect(session.title.value).toBe('Yoga Class');
      expect(session.durationMinutes.value).toBe(45);
      expect(session.status).toBe(SessionStatus.ACTIVE);
      expect(session.createdAtUtc).toBeDefined();
      expect(session.archivedAtUtc).toBeNull();
    });
  });
});
