import { describe, it, expect, vi } from 'vitest';
import { OnSessionFeedbackHidden } from '../../../application/event-handlers/on-session-feedback-hidden.js';
import { DetectProfessionalRisk } from '../../../application/use-cases/detect-professional-risk.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../../../application/ports/i-session-feedback-event-publisher.js';
import type { SessionFeedbackHiddenPayload } from '../../../domain/events/session-feedback-hidden-event.js';

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
  overrides: Partial<SessionFeedbackHiddenPayload> = {},
): SessionFeedbackHiddenPayload {
  return {
    feedbackId: 'feedback-001',
    professionalProfileId: 'prof-001',
    wasNegative: true,
    hiddenAtUtc: new Date().toISOString(),
    ...overrides,
  };
}

describe('OnSessionFeedbackHidden', () => {
  it('triggers risk recalculation when hidden feedback was negative', async () => {
    const repo = makeRepoMock(4);
    const publisher = makePublisher();
    const detectRisk = new DetectProfessionalRisk(repo, publisher);
    const handler = new OnSessionFeedbackHidden(detectRisk);

    await handler.handle(makePayload({ wasNegative: true }));

    expect(repo.countNegativeInWindow).toHaveBeenCalledWith('prof-001', 30, false);
  });

  it('does NOT trigger risk recalculation when hidden feedback was not negative', async () => {
    const repo = makeRepoMock(0);
    const publisher = makePublisher();
    const detectRisk = new DetectProfessionalRisk(repo, publisher);
    const handler = new OnSessionFeedbackHidden(detectRisk);

    await handler.handle(makePayload({ wasNegative: false }));

    expect(repo.countNegativeInWindow).not.toHaveBeenCalled();
  });

  it('emits resolved event when count drops below threshold after hide', async () => {
    const repo = makeRepoMock(3); // below WATCHLIST threshold of 5
    const publisher = makePublisher();
    const detectRisk = new DetectProfessionalRisk(repo, publisher);
    const handler = new OnSessionFeedbackHidden(detectRisk);

    await handler.handle(makePayload({ wasNegative: true }));

    expect(publisher.publishProfessionalRiskResolved).toHaveBeenCalledOnce();
    expect(publisher.publishProfessionalRiskDetected).not.toHaveBeenCalled();
  });

  it('emits detected event when count still above threshold after hide', async () => {
    const repo = makeRepoMock(6); // still above WATCHLIST threshold
    const publisher = makePublisher();
    const detectRisk = new DetectProfessionalRisk(repo, publisher);
    const handler = new OnSessionFeedbackHidden(detectRisk);

    await handler.handle(makePayload({ wasNegative: true }));

    expect(publisher.publishProfessionalRiskDetected).toHaveBeenCalledOnce();
    expect(publisher.publishProfessionalRiskResolved).not.toHaveBeenCalled();
  });

  it('does not throw on risk detection failure (best-effort)', async () => {
    const detectRisk = {
      execute: vi.fn().mockResolvedValue({ isLeft: () => true, value: new Error('DB error') }),
    } as unknown as DetectProfessionalRisk;
    const handler = new OnSessionFeedbackHidden(detectRisk);

    await expect(handler.handle(makePayload({ wasNegative: true }))).resolves.not.toThrow();
  });
});
