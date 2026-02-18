import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSession } from '../../../application/use-cases/create-session.js';
import { InMemorySessionRepository } from '../../repositories/in-memory-session-repository.js';
import { SchedulingErrorCodes } from '../../../domain/errors/scheduling-error-codes.js';
import { SessionStatus } from '../../../domain/enums/session-status.js';

describe('CreateSession', () => {
  let sessionRepository: InMemorySessionRepository;
  let sut: CreateSession;

  beforeEach(() => {
    sessionRepository = new InMemorySessionRepository();
    sut = new CreateSession(sessionRepository);
  });

  it('creates a session successfully', async () => {
    const result = await sut.execute({
      professionalProfileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Personal Training',
      durationMinutes: 60,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.title).toBe('Personal Training');
      expect(result.value.durationMinutes).toBe(60);
      expect(result.value.status).toBe(SessionStatus.ACTIVE);
      expect(result.value.sessionId).toBeDefined();
      expect(result.value.createdAtUtc).toBeDefined();
    }
    expect(sessionRepository.items).toHaveLength(1);
  });

  it('returns error for invalid title (empty)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: '',
      durationMinutes: 60,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_SESSION_TITLE);
    }
  });

  it('returns error for invalid duration (zero)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Yoga',
      durationMinutes: 0,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_DURATION);
    }
  });

  it('returns error for invalid duration (too large)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Marathon',
      durationMinutes: 999,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(SchedulingErrorCodes.INVALID_DURATION);
    }
  });
});
