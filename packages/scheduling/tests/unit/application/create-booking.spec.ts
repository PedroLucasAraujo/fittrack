import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateBooking } from '../../../application/use-cases/create-booking.js';
import { InMemoryBookingRepository } from '../../repositories/in-memory-booking-repository.js';
import { InMemorySessionRepository } from '../../repositories/in-memory-session-repository.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { BookingStatus } from '../../../domain/enums/booking-status.js';
import { makeSession } from '../../factories/make-session.js';
import { makeBooking } from '../../factories/make-booking.js';
import { SessionStatus } from '../../../domain/enums/session-status.js';
import { ErrorCodes } from '@fittrack/core';

describe('CreateBooking', () => {
  let bookingRepository: InMemoryBookingRepository;
  let sessionRepository: InMemorySessionRepository;
  let sut: CreateBooking;
  let professionalProfileId: string;
  let session: ReturnType<typeof makeSession>;

  beforeEach(() => {
    bookingRepository = new InMemoryBookingRepository();
    sessionRepository = new InMemorySessionRepository();
    sut = new CreateBooking(bookingRepository, sessionRepository, {
      maxOpenBookingsPerClient: 10,
    });

    professionalProfileId = generateId();
    session = makeSession({
      professionalProfileId,
      status: SessionStatus.ACTIVE,
    });
    sessionRepository.items.push(session);
  });

  it('creates a booking successfully in PENDING status', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(BookingStatus.PENDING);
      expect(result.value.logicalDay).toBe('2025-07-15');
      expect(result.value.timezoneUsed).toBe('America/Sao_Paulo');
      expect(result.value.bookingId).toBeDefined();
    }
    expect(bookingRepository.items).toHaveLength(1);
  });

  it('blocks booking when professional is banned (ADR-0022)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      true,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.PROFESSIONAL_BANNED);
    }
    expect(bookingRepository.items).toHaveLength(0);
  });

  it('returns error for invalid session UUID', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: 'not-a-uuid',
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
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
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SESSION_NOT_FOUND);
    }
  });

  it('returns error when session belongs to different tenant (ADR-0025)', async () => {
    const otherProfId = generateId();
    const result = await sut.execute(
      {
        professionalProfileId: otherProfId, // different from session's owner
        clientId: generateId(),
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SESSION_NOT_FOUND);
    }
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
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.SESSION_NOT_ACTIVE);
    }
  });

  it('returns error for invalid scheduledAtUtc (non-UTC)', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00+03:00', // no Z ending
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.TEMPORAL_VIOLATION);
    }
  });

  it('returns error for invalid timezone', async () => {
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'Invalid/Timezone',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ErrorCodes.INVALID_TIMEZONE);
    }
  });

  it('prevents double booking on same session+day (ADR-0006)', async () => {
    // Create first booking
    const clientId = generateId();
    await sut.execute(
      {
        professionalProfileId,
        clientId,
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    // Try to create second booking on same session+day
    const result = await sut.execute(
      {
        professionalProfileId,
        clientId: generateId(),
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T16:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.DOUBLE_BOOKING);
    }
  });

  it('enforces open booking limit per client (ADR-0041)', async () => {
    const clientId = generateId();

    // Seed 10 open bookings for this client
    for (let i = 0; i < 10; i++) {
      const otherSession = makeSession({
        professionalProfileId,
        status: SessionStatus.ACTIVE,
      });
      sessionRepository.items.push(otherSession);

      bookingRepository.items.push(
        makeBooking({
          professionalProfileId,
          clientId,
          sessionId: otherSession.id,
          status: BookingStatus.PENDING,
        }),
      );
    }

    const result = await sut.execute(
      {
        professionalProfileId,
        clientId,
        sessionId: session.id,
        scheduledAtUtc: '2025-07-15T14:00:00.000Z',
        timezoneUsed: 'America/Sao_Paulo',
      },
      false,
    );

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.OPERATIONAL_LIMIT_EXCEEDED);
    }
  });
});
