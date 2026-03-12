import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { FlagSessionFeedback } from '../../../application/use-cases/flag-session-feedback.js';
import { SessionFeedback } from '../../../domain/aggregates/session-feedback.js';
import { SessionRating } from '../../../domain/value-objects/session-rating.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../../../application/ports/i-session-feedback-event-publisher.js';

function makeFeedback(): SessionFeedback {
  const rating = (SessionRating.create(2) as { value: SessionRating }).value;
  const result = SessionFeedback.create({
    professionalProfileId: 'prof-001',
    clientId: 'client-001',
    bookingId: 'booking-001',
    rating,
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
    publishFeedbackFlagged: vi.fn().mockResolvedValue(undefined),
    publishFeedbackHidden: vi.fn(),
    publishProfessionalRiskDetected: vi.fn(),
    publishProfessionalRiskResolved: vi.fn(),
  };
}

describe('FlagSessionFeedback', () => {
  let feedback: SessionFeedback;
  let publisher: ISessionFeedbackEventPublisher;

  beforeEach(() => {
    feedback = makeFeedback();
    publisher = makePublisher();
  });

  it('allows professional to flag their own feedback', async () => {
    const repo = makeRepo(feedback);
    const useCase = new FlagSessionFeedback(repo, publisher);

    const result = await useCase.execute({
      feedbackId: feedback.id,
      flaggedBy: 'prof-001', // matches professionalProfileId
      flaggedByRole: 'professional',
      reason: 'This feedback contains abusive language.',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(publisher.publishFeedbackFlagged).toHaveBeenCalledOnce();
  });

  it('allows admin to flag any feedback', async () => {
    const repo = makeRepo(feedback);
    const useCase = new FlagSessionFeedback(repo, publisher);

    const result = await useCase.execute({
      feedbackId: feedback.id,
      flaggedBy: 'admin-999',
      flaggedByRole: 'admin',
      reason: 'Content violates community guidelines.',
    });

    expect(result.isRight()).toBe(true);
  });

  it("rejects professional flagging another professional's feedback", async () => {
    const repo = makeRepo(feedback);
    const useCase = new FlagSessionFeedback(repo, publisher);

    const result = await useCase.execute({
      feedbackId: feedback.id,
      flaggedBy: 'prof-DIFFERENT', // different professional
      flaggedByRole: 'professional',
      reason: 'This does not belong to me.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain('Unauthorized');
    }
  });

  it('returns FeedbackNotFoundError when feedback does not exist', async () => {
    const repo = makeRepo(null);
    const useCase = new FlagSessionFeedback(repo, publisher);

    const result = await useCase.execute({
      feedbackId: 'nonexistent-id',
      flaggedBy: 'admin-999',
      flaggedByRole: 'admin',
      reason: 'Content violates community guidelines.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain('not found');
    }
  });

  it('rejects flagging already-flagged feedback', async () => {
    const repo = makeRepo(feedback);
    const useCase = new FlagSessionFeedback(repo, publisher);
    const dto = {
      feedbackId: feedback.id,
      flaggedBy: 'admin-999',
      flaggedByRole: 'admin' as const,
      reason: 'Content violates community guidelines.',
    };

    await useCase.execute(dto);
    const secondFlag = await useCase.execute(dto);

    expect(secondFlag.isLeft()).toBe(true);
  });

  it('rejects reason shorter than 10 characters', async () => {
    const repo = makeRepo(feedback);
    const useCase = new FlagSessionFeedback(repo, publisher);

    const result = await useCase.execute({
      feedbackId: feedback.id,
      flaggedBy: 'admin-999',
      flaggedByRole: 'admin',
      reason: 'Short',
    });

    expect(result.isLeft()).toBe(true);
  });
});
