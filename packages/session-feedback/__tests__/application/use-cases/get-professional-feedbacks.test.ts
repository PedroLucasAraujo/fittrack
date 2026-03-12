import { describe, it, expect, vi } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { GetProfessionalFeedbacks } from '../../../application/use-cases/get-professional-feedbacks.js';
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

function makeFeedback(overrides: { rating?: 1 | 2 | 3 | 4 | 5; daysAgo?: number } = {}) {
  const result = SessionFeedback.create({
    professionalProfileId: 'prof-001',
    clientId: 'client-001',
    bookingId: `booking-${Math.random()}`,
    rating: makeRating(overrides.rating ?? 5),
    comment: null,
    sessionDate: '2025-01-15',
    submittedAtUtc: makeUTCDateTime(overrides.daysAgo ?? 0),
  });
  if (result.isLeft()) throw new Error('Failed to create feedback');
  return result.value;
}

function makeRepoMock(feedbacks: SessionFeedback[]): ISessionFeedbackRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByBookingId: vi.fn().mockResolvedValue(null),
    existsByBookingId: vi.fn().mockResolvedValue(false),
    findByProfessionalId: vi.fn().mockResolvedValue(feedbacks),
    findByClientId: vi.fn().mockResolvedValue([]),
    countNegativeInWindow: vi.fn().mockResolvedValue(0),
    getAverageRating: vi.fn().mockResolvedValue(null),
    findFlagged: vi.fn().mockResolvedValue([]),
  };
}

describe('GetProfessionalFeedbacks', () => {
  it('returns all feedbacks for a professional', async () => {
    const feedbacks = [makeFeedback({ rating: 5 }), makeFeedback({ rating: 3 })];
    const repo = makeRepoMock(feedbacks);
    const useCase = new GetProfessionalFeedbacks(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
      expect(result.value.feedbacks).toHaveLength(2);
    }
    expect(repo.findByProfessionalId).toHaveBeenCalledWith('prof-001', false);
  });

  it('omits clientId from output items', async () => {
    const repo = makeRepoMock([makeFeedback()]);
    const useCase = new GetProfessionalFeedbacks(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const item = result.value.feedbacks[0]!;
      expect(item).not.toHaveProperty('clientId');
      expect(item.feedbackId).toBeTruthy();
      expect(item.bookingId).toBeTruthy();
      expect(item.rating).toBeGreaterThanOrEqual(1);
    }
  });

  it('passes includeHidden=true to repo when requested', async () => {
    const repo = makeRepoMock([]);
    const useCase = new GetProfessionalFeedbacks(repo);

    await useCase.execute({ professionalProfileId: 'prof-001', includeHidden: true });

    expect(repo.findByProfessionalId).toHaveBeenCalledWith('prof-001', true);
  });

  it('filters by windowDays — excludes feedbacks older than the window', async () => {
    const recent = makeFeedback({ daysAgo: 5 });
    const old = makeFeedback({ daysAgo: 40 });
    const repo = makeRepoMock([recent, old]);
    const useCase = new GetProfessionalFeedbacks(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001', windowDays: 30 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
    }
  });

  it('returns empty list when professional has no feedbacks', async () => {
    const repo = makeRepoMock([]);
    const useCase = new GetProfessionalFeedbacks(repo);

    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(0);
      expect(result.value.feedbacks).toHaveLength(0);
    }
  });

  it('rejects empty professionalProfileId', async () => {
    const repo = makeRepoMock([]);
    const useCase = new GetProfessionalFeedbacks(repo);

    const result = await useCase.execute({ professionalProfileId: '' });

    expect(result.isLeft()).toBe(true);
  });

  it('maps isFlagged and isHidden correctly', async () => {
    const feedback = makeFeedback();
    feedback.hide();
    const repo = makeRepoMock([feedback]);
    const useCase = new GetProfessionalFeedbacks(repo);

    const result = await useCase.execute({
      professionalProfileId: 'prof-001',
      includeHidden: true,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const item = result.value.feedbacks[0]!;
      expect(item.isHidden).toBe(true);
      expect(item.isFlagged).toBe(false);
    }
  });
});
