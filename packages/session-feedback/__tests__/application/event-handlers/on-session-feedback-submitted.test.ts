import { describe, it, expect, vi } from 'vitest';
import { OnSessionFeedbackSubmitted } from '../../../application/event-handlers/on-session-feedback-submitted.js';
import { DetectProfessionalRisk } from '../../../application/use-cases/detect-professional-risk.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../../../application/ports/i-session-feedback-event-publisher.js';
import type { SessionFeedbackSubmittedPayload } from '../../../domain/events/session-feedback-submitted-event.js';

function makeRepoMock(negativeCount: number): ISessionFeedbackRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByBookingId: vi.fn().mockResolvedValue(null),
    existsByBookingId: vi.fn().mockResolvedValue(false),
    findByProfessionalId: vi.fn().mockResolvedValue([]),
    findByClientId: vi.fn().mockResolvedValue([]),
    countNegativeInWindow: vi.fn().mockResolvedValue(negativeCount),
    getAverageRating: vi.fn().mockResolvedValue(null),
    findFlagged: vi.fn().mockResolvedValue([]),
  };
}

function makePublisher(): ISessionFeedbackEventPublisher {
  return {
    publishFeedbackSubmitted: vi.fn(),
    publishFeedbackFlagged: vi.fn(),
    publishFeedbackHidden: vi.fn(),
    publishProfessionalRiskDetected: vi.fn().mockResolvedValue(undefined),
    publishProfessionalRiskResolved: vi.fn().mockResolvedValue(undefined),
  };
}

function makePayload(
  overrides: Partial<SessionFeedbackSubmittedPayload> = {},
): SessionFeedbackSubmittedPayload {
  return {
    feedbackId: 'feedback-001',
    bookingId: 'booking-001',
    clientId: 'client-001',
    professionalProfileId: 'prof-001',
    rating: 2,
    isNegative: true,
    sessionDate: '2025-01-15',
    submittedAtUtc: new Date().toISOString(),
    ...overrides,
  };
}

describe('OnSessionFeedbackSubmitted', () => {
  it('triggers risk detection for negative feedback', async () => {
    const repo = makeRepoMock(5);
    const publisher = makePublisher();
    const detectRisk = new DetectProfessionalRisk(repo, publisher);
    const handler = new OnSessionFeedbackSubmitted(detectRisk);

    await handler.handle(makePayload({ isNegative: true }));

    expect(repo.countNegativeInWindow).toHaveBeenCalledWith('prof-001', 30, false);
    expect(publisher.publishProfessionalRiskDetected).toHaveBeenCalledOnce();
  });

  it('does NOT trigger risk detection for non-negative feedback', async () => {
    const repo = makeRepoMock(0);
    const publisher = makePublisher();
    const detectRisk = new DetectProfessionalRisk(repo, publisher);
    const handler = new OnSessionFeedbackSubmitted(detectRisk);

    await handler.handle(makePayload({ isNegative: false, rating: 5 }));

    expect(repo.countNegativeInWindow).not.toHaveBeenCalled();
    expect(publisher.publishProfessionalRiskDetected).not.toHaveBeenCalled();
  });

  it('does not throw on risk detection failure (best-effort)', async () => {
    // Make detect use case fail
    const detectRisk = {
      execute: vi.fn().mockResolvedValue({ isLeft: () => true, value: new Error('DB error') }),
    } as unknown as DetectProfessionalRisk;
    const handler = new OnSessionFeedbackSubmitted(detectRisk);

    await expect(handler.handle(makePayload({ isNegative: true }))).resolves.not.toThrow();
  });
});
