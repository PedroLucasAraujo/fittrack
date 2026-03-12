import { describe, it, expect, vi } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { HideSessionFeedback } from '../../../application/use-cases/hide-session-feedback.js';
import { SessionFeedback } from '../../../domain/aggregates/session-feedback.js';
import { SessionRating } from '../../../domain/value-objects/session-rating.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../../../application/ports/i-session-feedback-event-publisher.js';

function makeFeedback(rating: 1 | 2 | 3 | 4 | 5 = 2): SessionFeedback {
  const ratingVo = (SessionRating.create(rating) as { value: SessionRating }).value;
  const result = SessionFeedback.create({
    professionalProfileId: 'prof-001',
    clientId: 'client-001',
    bookingId: 'booking-001',
    rating: ratingVo,
    comment: null,
    sessionDate: '2025-01-15',
    submittedAtUtc: UTCDateTime.now(),
  });
  if (result.isLeft()) throw new Error(result.value.message);
  return result.value;
}

function makeRepo(feedback: SessionFeedback | null): ISessionFeedbackRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(feedback),
    findByBookingId: vi.fn().mockResolvedValue(null),
    existsByBookingId: vi.fn().mockResolvedValue(false),
    findByProfessionalId: vi.fn().mockResolvedValue([]),
    findByClientId: vi.fn().mockResolvedValue([]),
    countNegativeInWindow: vi.fn().mockResolvedValue(0),
    getAverageRating: vi.fn().mockResolvedValue(null),
    findFlagged: vi.fn().mockResolvedValue([]),
  };
}

function makePublisher(): ISessionFeedbackEventPublisher {
  return {
    publishFeedbackSubmitted: vi.fn(),
    publishFeedbackFlagged: vi.fn(),
    publishFeedbackHidden: vi.fn().mockResolvedValue(undefined),
    publishProfessionalRiskDetected: vi.fn(),
    publishProfessionalRiskResolved: vi.fn(),
  };
}

describe('HideSessionFeedback', () => {
  it('hides a visible feedback', async () => {
    const feedback = makeFeedback();
    const useCase = new HideSessionFeedback(makeRepo(feedback), makePublisher());

    const result = await useCase.execute({
      feedbackId: feedback.id,
      hiddenBy: 'admin-999',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.feedbackId).toBe(feedback.id);
      expect(result.value.hiddenAtUtc).toBeTruthy();
    }
  });

  it('publishes event with wasNegative=true for negative feedback', async () => {
    const feedback = makeFeedback(2); // negative
    const publisher = makePublisher();
    const useCase = new HideSessionFeedback(makeRepo(feedback), publisher);

    await useCase.execute({ feedbackId: feedback.id, hiddenBy: 'admin-999' });

    const event = (publisher.publishFeedbackHidden as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.payload.wasNegative).toBe(true);
  });

  it('publishes event with wasNegative=false for positive feedback', async () => {
    const feedback = makeFeedback(5); // positive
    const publisher = makePublisher();
    const useCase = new HideSessionFeedback(makeRepo(feedback), publisher);

    await useCase.execute({ feedbackId: feedback.id, hiddenBy: 'admin-999' });

    const event = (publisher.publishFeedbackHidden as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.payload.wasNegative).toBe(false);
  });

  it('returns FeedbackNotFoundError when feedback does not exist', async () => {
    const useCase = new HideSessionFeedback(makeRepo(null), makePublisher());

    const result = await useCase.execute({
      feedbackId: 'nonexistent-id',
      hiddenBy: 'admin-999',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('rejects double-hiding', async () => {
    const feedback = makeFeedback();
    const repo = makeRepo(feedback);
    const useCase = new HideSessionFeedback(repo, makePublisher());

    await useCase.execute({ feedbackId: feedback.id, hiddenBy: 'admin-999' });
    const secondHide = await useCase.execute({ feedbackId: feedback.id, hiddenBy: 'admin-999' });

    expect(secondHide.isLeft()).toBe(true);
  });
});
