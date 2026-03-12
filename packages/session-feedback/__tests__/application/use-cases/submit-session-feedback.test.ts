import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubmitSessionFeedback } from '../../../application/use-cases/submit-session-feedback.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../../../application/ports/i-session-feedback-event-publisher.js';

function makeRepoMock(
  overrides: Partial<ISessionFeedbackRepository> = {},
): ISessionFeedbackRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByBookingId: vi.fn().mockResolvedValue(null),
    existsByBookingId: vi.fn().mockResolvedValue(false),
    findByProfessionalId: vi.fn().mockResolvedValue([]),
    findByClientId: vi.fn().mockResolvedValue([]),
    countNegativeInWindow: vi.fn().mockResolvedValue(0),
    getAverageRating: vi.fn().mockResolvedValue(null),
    findFlagged: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makePublisherMock(): ISessionFeedbackEventPublisher {
  return {
    publishFeedbackSubmitted: vi.fn().mockResolvedValue(undefined),
    publishFeedbackFlagged: vi.fn().mockResolvedValue(undefined),
    publishFeedbackHidden: vi.fn().mockResolvedValue(undefined),
    publishProfessionalRiskDetected: vi.fn().mockResolvedValue(undefined),
    publishProfessionalRiskResolved: vi.fn().mockResolvedValue(undefined),
  };
}

function makeValidDto(overrides: Record<string, unknown> = {}) {
  const completedAt = new Date();
  completedAt.setHours(completedAt.getHours() - 1); // 1 hour ago (within window)
  return {
    bookingId: 'booking-abc',
    clientId: 'client-xyz',
    professionalProfileId: 'prof-001',
    rating: 5,
    sessionDate: '2025-01-15',
    completedAtUtc: completedAt.toISOString(),
    ...overrides,
  };
}

describe('SubmitSessionFeedback', () => {
  let repo: ISessionFeedbackRepository;
  let publisher: ISessionFeedbackEventPublisher;
  let useCase: SubmitSessionFeedback;

  beforeEach(() => {
    repo = makeRepoMock();
    publisher = makePublisherMock();
    useCase = new SubmitSessionFeedback(repo, publisher);
  });

  describe('happy path', () => {
    it('creates feedback and publishes event', async () => {
      const result = await useCase.execute(makeValidDto());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.bookingId).toBe('booking-abc');
        expect(result.value.rating).toBe(5);
        expect(result.value.feedbackId).toBeTruthy();
      }
      expect(repo.save).toHaveBeenCalledOnce();
      expect(publisher.publishFeedbackSubmitted).toHaveBeenCalledOnce();
    });

    it('creates feedback with comment', async () => {
      const result = await useCase.execute(
        makeValidDto({ comment: 'Really excellent session overall!' }),
      );
      expect(result.isRight()).toBe(true);
    });

    it('publishes event with isNegative=false for positive rating', async () => {
      await useCase.execute(makeValidDto({ rating: 5 }));
      const call = (publisher.publishFeedbackSubmitted as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      expect(call.payload.isNegative).toBe(false);
    });

    it('publishes event with isNegative=true for negative rating', async () => {
      await useCase.execute(makeValidDto({ rating: 2 }));
      const call = (publisher.publishFeedbackSubmitted as ReturnType<typeof vi.fn>).mock
        .calls[0]![0];
      expect(call.payload.isNegative).toBe(true);
    });
  });

  describe('validation failures', () => {
    it('rejects empty bookingId', async () => {
      const result = await useCase.execute(makeValidDto({ bookingId: '' }));
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty clientId', async () => {
      const result = await useCase.execute(makeValidDto({ clientId: '' }));
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty professionalProfileId', async () => {
      const result = await useCase.execute(makeValidDto({ professionalProfileId: '' }));
      expect(result.isLeft()).toBe(true);
    });

    it('rejects missing completedAtUtc (booking not completed signal)', async () => {
      const dto = makeValidDto();
      // @ts-expect-error intentional
      delete dto.completedAtUtc;
      const result = await useCase.execute(dto);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects invalid rating 0', async () => {
      const result = await useCase.execute(makeValidDto({ rating: 0 }));
      expect(result.isLeft()).toBe(true);
    });

    it('rejects invalid rating 6', async () => {
      const result = await useCase.execute(makeValidDto({ rating: 6 }));
      expect(result.isLeft()).toBe(true);
    });

    it('rejects comment shorter than 10 chars', async () => {
      const result = await useCase.execute(makeValidDto({ comment: 'Short' }));
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('business rules', () => {
    it('rejects feedback when window has expired (>48h)', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 49); // 49 hours ago
      const result = await useCase.execute(makeValidDto({ completedAtUtc: oldDate.toISOString() }));
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain('Feedback window');
      }
    });

    it('rejects duplicate feedback for same booking', async () => {
      repo = makeRepoMock({ existsByBookingId: vi.fn().mockResolvedValue(true) });
      useCase = new SubmitSessionFeedback(repo, publisher);

      const result = await useCase.execute(makeValidDto());
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toContain('feedback already exists');
      }
    });

    it('rejects invalid completedAtUtc string', async () => {
      const result = await useCase.execute(makeValidDto({ completedAtUtc: 'not-a-date' }));
      expect(result.isLeft()).toBe(true);
    });

    it('does not save when validation fails', async () => {
      await useCase.execute(makeValidDto({ rating: 0 }));
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('does not publish event when validation fails', async () => {
      await useCase.execute(makeValidDto({ rating: 0 }));
      expect(publisher.publishFeedbackSubmitted).not.toHaveBeenCalled();
    });
  });
});
