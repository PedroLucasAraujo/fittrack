import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { makeBooking, makeNewBooking } from '../../factories/make-booking.js';

describe('Booking', () => {
  // ── Creation ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates with PENDING status', () => {
      const booking = makeNewBooking();

      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(booking.cancelledBy).toBeNull();
      expect(booking.cancellationReason).toBeNull();
      expect(booking.cancelledAtUtc).toBeNull();
      expect(booking.completedAtUtc).toBeNull();
      expect(booking.executionId).toBeNull();
      expect(booking.isOpen()).toBe(true);
      expect(booking.isTerminal()).toBe(false);
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const booking = makeNewBooking();
      expect(booking.getDomainEvents()).toHaveLength(0);
    });

    it('uses provided id when given', () => {
      const id = generateId();
      const booking = makeNewBooking({ id });
      expect(booking.id).toBe(id);
    });
  });

  describe('reconstitute()', () => {
    it('does not emit events', () => {
      const booking = makeBooking();
      expect(booking.getDomainEvents()).toHaveLength(0);
    });

    it('preserves version', () => {
      const booking = makeBooking({ version: 3 });
      expect(booking.version).toBe(3);
    });
  });

  // ── Confirm (ADR-0008) ────────────────────────────────────────────────────

  describe('confirm()', () => {
    it('transitions PENDING → CONFIRMED', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });

      const result = booking.confirm();

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(booking.isOpen()).toBe(true);
    });

    it('does not emit domain events', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      booking.confirm();
      expect(booking.getDomainEvents()).toHaveLength(0);
    });

    it('rejects from CONFIRMED', () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      expect(booking.confirm().isLeft()).toBe(true);
    });

    it('rejects from CANCELLED_BY_CLIENT (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED_BY_CLIENT });
      expect(booking.confirm().isLeft()).toBe(true);
    });

    it('rejects from COMPLETED (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.COMPLETED });
      expect(booking.confirm().isLeft()).toBe(true);
    });

    it('rejects from NO_SHOW (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.NO_SHOW });
      expect(booking.confirm().isLeft()).toBe(true);
    });
  });

  // ── cancelByClient (ADR-0008) ─────────────────────────────────────────────

  describe('cancelByClient()', () => {
    it('transitions PENDING → CANCELLED_BY_CLIENT', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });

      const result = booking.cancelByClient('Schedule conflict');

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.CANCELLED_BY_CLIENT);
      expect(booking.cancelledBy).toBe('CLIENT');
      expect(booking.cancellationReason).toBe('Schedule conflict');
      expect(booking.cancelledAtUtc).not.toBeNull();
      expect(booking.isTerminal()).toBe(true);
    });

    it('transitions CONFIRMED → CANCELLED_BY_CLIENT', () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });

      const result = booking.cancelByClient('Changed my mind');

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.CANCELLED_BY_CLIENT);
    });

    it('rejects from CANCELLED_BY_CLIENT (already terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED_BY_CLIENT });

      const result = booking.cancelByClient('Again');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_BOOKING_TRANSITION);
      }
    });

    it('rejects from COMPLETED (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.COMPLETED });
      expect(booking.cancelByClient('Too late').isLeft()).toBe(true);
    });

    it('rejects from CANCELLED_BY_SYSTEM (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED_BY_SYSTEM });
      expect(booking.cancelByClient('Try anyway').isLeft()).toBe(true);
    });
  });

  // ── cancelByProfessional (ADR-0008) ───────────────────────────────────────

  describe('cancelByProfessional()', () => {
    it('transitions PENDING → CANCELLED_BY_PROFESSIONAL', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });

      const result = booking.cancelByProfessional('Unavailable');

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.CANCELLED_BY_PROFESSIONAL);
      expect(booking.cancelledBy).toBe('PROFESSIONAL');
      expect(booking.cancellationReason).toBe('Unavailable');
    });

    it('transitions CONFIRMED → CANCELLED_BY_PROFESSIONAL', () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      const result = booking.cancelByProfessional('Emergency');
      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.CANCELLED_BY_PROFESSIONAL);
    });

    it('rejects from NO_SHOW (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.NO_SHOW });
      expect(booking.cancelByProfessional('Late cancel').isLeft()).toBe(true);
    });

    it('rejects from CANCELLED_BY_PROFESSIONAL (already terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED_BY_PROFESSIONAL });
      expect(booking.cancelByProfessional('Again').isLeft()).toBe(true);
    });
  });

  // ── cancelBySystem (ADR-0008) ─────────────────────────────────────────────

  describe('cancelBySystem()', () => {
    it('transitions CONFIRMED → CANCELLED_BY_SYSTEM', () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });

      const result = booking.cancelBySystem('AccessGrant revoked');

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.CANCELLED_BY_SYSTEM);
      expect(booking.cancelledBy).toBe('SYSTEM');
      expect(booking.cancellationReason).toBe('AccessGrant revoked');
      expect(booking.cancelledAtUtc).not.toBeNull();
    });

    it('rejects from PENDING (not valid transition)', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      expect(booking.cancelBySystem('Invalid').isLeft()).toBe(true);
    });

    it('rejects from COMPLETED (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.COMPLETED });
      expect(booking.cancelBySystem('Too late').isLeft()).toBe(true);
    });
  });

  // ── complete (ADR-0008) ───────────────────────────────────────────────────

  describe('complete()', () => {
    it('transitions CONFIRMED → COMPLETED with executionId', () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      const execId = generateId();

      const result = booking.complete(execId);

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.COMPLETED);
      expect(booking.executionId).toBe(execId);
      expect(booking.completedAtUtc).not.toBeNull();
      expect(booking.isTerminal()).toBe(true);
    });

    it('rejects from PENDING', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      expect(booking.complete(generateId()).isLeft()).toBe(true);
    });

    it('rejects from CANCELLED_BY_CLIENT (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED_BY_CLIENT });
      expect(booking.complete(generateId()).isLeft()).toBe(true);
    });
  });

  // ── markNoShow (ADR-0008) ─────────────────────────────────────────────────

  describe('markNoShow()', () => {
    it('transitions CONFIRMED → NO_SHOW', () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });

      const result = booking.markNoShow();

      expect(result.isRight()).toBe(true);
      expect(booking.status).toBe(BookingStatus.NO_SHOW);
      expect(booking.isTerminal()).toBe(true);
    });

    it('rejects from PENDING', () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      expect(booking.markNoShow().isLeft()).toBe(true);
    });

    it('rejects from COMPLETED (terminal)', () => {
      const booking = makeBooking({ status: BookingStatus.COMPLETED });
      expect(booking.markNoShow().isLeft()).toBe(true);
    });
  });

  // ── Query methods ─────────────────────────────────────────────────────────

  describe('isTerminal()', () => {
    it.each([
      BookingStatus.CANCELLED_BY_CLIENT,
      BookingStatus.CANCELLED_BY_PROFESSIONAL,
      BookingStatus.CANCELLED_BY_SYSTEM,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
    ])('returns true for terminal status %s', (status) => {
      const booking = makeBooking({ status });
      expect(booking.isTerminal()).toBe(true);
    });

    it.each([BookingStatus.PENDING, BookingStatus.CONFIRMED])(
      'returns false for non-terminal status %s',
      (status) => {
        const booking = makeBooking({ status });
        expect(booking.isTerminal()).toBe(false);
      },
    );
  });

  describe('isOpen()', () => {
    it('returns true for PENDING', () => {
      expect(makeBooking({ status: BookingStatus.PENDING }).isOpen()).toBe(true);
    });

    it('returns true for CONFIRMED', () => {
      expect(makeBooking({ status: BookingStatus.CONFIRMED }).isOpen()).toBe(true);
    });

    it('returns false for terminal statuses', () => {
      expect(makeBooking({ status: BookingStatus.COMPLETED }).isOpen()).toBe(false);
    });
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  describe('getters', () => {
    it('exposes all fields via getters', () => {
      const profId = generateId();
      const clientId = generateId();
      const sessionId = generateId();

      const booking = makeBooking({
        professionalProfileId: profId,
        clientId,
        sessionId,
        status: BookingStatus.PENDING,
        timezoneUsed: 'America/Sao_Paulo',
      });

      expect(booking.professionalProfileId).toBe(profId);
      expect(booking.clientId).toBe(clientId);
      expect(booking.sessionId).toBe(sessionId);
      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(booking.timezoneUsed).toBe('America/Sao_Paulo');
      expect(booking.scheduledAtUtc).toBeDefined();
      expect(booking.logicalDay).toBeDefined();
      expect(booking.createdAtUtc).toBeDefined();
    });
  });
});
