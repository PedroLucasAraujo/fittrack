import { describe, it, expect, vi } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { GetProfessionalAverageRating } from '../../../application/use-cases/get-professional-average-rating.js';
import { SessionFeedback } from '../../../domain/aggregates/session-feedback.js';
import { SessionRating } from '../../../domain/value-objects/session-rating.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';

function makeRating(value: 1 | 2 | 3 | 4 | 5): SessionRating {
  return (SessionRating.create(value) as { value: SessionRating }).value;
}

function makeUTCDateTime(daysAgo = 0): UTCDateTime {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const r = UTCDateTime.from(d);
  if (r.isLeft()) throw new Error('Invalid date');
  return r.value;
}

function makeFeedback(daysAgo = 0) {
  const result = SessionFeedback.create({
    professionalProfileId: 'prof-001',
    clientId: 'client-001',
    bookingId: `booking-${Math.random()}`,
    rating: makeRating(4),
    comment: null,
    sessionDate: '2025-01-15',
    submittedAtUtc: makeUTCDateTime(daysAgo),
  });
  if (result.isLeft()) throw new Error('Failed to create feedback');
  return result.value;
}

function makeRepoMock(
  averageRating: number | null,
  feedbacks: SessionFeedback[] = [],
): ISessionFeedbackRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByBookingId: vi.fn().mockResolvedValue(null),
    existsByBookingId: vi.fn().mockResolvedValue(false),
    findByProfessionalId: vi.fn().mockResolvedValue(feedbacks),
    findByClientId: vi.fn().mockResolvedValue([]),
    countNegativeInWindow: vi.fn().mockResolvedValue(0),
    getAverageRating: vi.fn().mockResolvedValue(averageRating),
    findFlagged: vi.fn().mockResolvedValue([]),
  };
}

describe('GetProfessionalAverageRating', () => {
  it('returns average rating and total feedback count', async () => {
    const feedbacks = [makeFeedback(), makeFeedback(), makeFeedback()];
    const repo = makeRepoMock(4.2, feedbacks);
    const useCase = new GetProfessionalAverageRating(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.professionalProfileId).toBe('prof-001');
      expect(result.value.averageRating).toBe(4.2);
      expect(result.value.totalFeedbacks).toBe(3);
      expect(result.value.windowDays).toBeNull();
    }
  });

  it('returns null average when professional has no feedbacks', async () => {
    const repo = makeRepoMock(null, []);
    const useCase = new GetProfessionalAverageRating(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.averageRating).toBeNull();
      expect(result.value.totalFeedbacks).toBe(0);
    }
  });

  it('passes windowDays to getAverageRating and filters feedbacks', async () => {
    const recent = makeFeedback(5);
    const old = makeFeedback(40);
    const repo = makeRepoMock(4.0, [recent, old]);
    const useCase = new GetProfessionalAverageRating(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001', windowDays: 30 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.windowDays).toBe(30);
      expect(result.value.totalFeedbacks).toBe(1);
    }
    expect(repo.getAverageRating).toHaveBeenCalledWith('prof-001', 30);
  });

  it('calls getAverageRating without windowDays for all-time query', async () => {
    const repo = makeRepoMock(3.5, [makeFeedback()]);
    const useCase = new GetProfessionalAverageRating(repo);

    await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(repo.getAverageRating).toHaveBeenCalledWith('prof-001', undefined);
  });

  it('rejects empty professionalProfileId', async () => {
    const repo = makeRepoMock(null);
    const useCase = new GetProfessionalAverageRating(repo);

    const result = await useCase.execute({ professionalProfileId: '' });

    expect(result.isLeft()).toBe(true);
  });
});
