import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DetectProfessionalRisk } from '../../../application/use-cases/detect-professional-risk.js';
import type { ISessionFeedbackRepository } from '../../../domain/repositories/i-session-feedback-repository.js';
import type { ISessionFeedbackEventPublisher } from '../../../application/ports/i-session-feedback-event-publisher.js';

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

function makePublisherMock(): ISessionFeedbackEventPublisher {
  return {
    publishFeedbackSubmitted: vi.fn(),
    publishFeedbackFlagged: vi.fn(),
    publishFeedbackHidden: vi.fn(),
    publishProfessionalRiskDetected: vi.fn().mockResolvedValue(undefined),
    publishProfessionalRiskResolved: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DetectProfessionalRisk', () => {
  let publisher: ISessionFeedbackEventPublisher;

  beforeEach(() => {
    publisher = makePublisherMock();
  });

  it('returns no risk when count is 0 and emits resolved event', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(0), publisher);
    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.riskDetected).toBe(false);
      expect(result.value.riskLevel).toBeNull();
      expect(result.value.negativeFeedbackCount).toBe(0);
    }
    expect(publisher.publishProfessionalRiskDetected).not.toHaveBeenCalled();
    expect(publisher.publishProfessionalRiskResolved).toHaveBeenCalledOnce();
  });

  it('returns no risk when count is 4 and emits resolved event', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(4), publisher);
    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.riskDetected).toBe(false);
      expect(result.value.riskLevel).toBeNull();
    }
    expect(publisher.publishProfessionalRiskDetected).not.toHaveBeenCalled();
    expect(publisher.publishProfessionalRiskResolved).toHaveBeenCalledOnce();
  });

  it('publishes resolved event with correct payload', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(3), publisher);
    await useCase.execute({ professionalProfileId: 'prof-001' });

    const event = (publisher.publishProfessionalRiskResolved as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(event.payload.professionalProfileId).toBe('prof-001');
    expect(event.payload.negativeFeedbackCount).toBe(3);
    expect(event.payload.windowDays).toBe(30);
    expect(event.payload.resolvedAtUtc).toBeTruthy();
  });

  it('detects WATCHLIST risk when count reaches 5', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(5), publisher);
    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.riskDetected).toBe(true);
      expect(result.value.riskLevel).toBe('WATCHLIST');
      expect(result.value.negativeFeedbackCount).toBe(5);
    }
    expect(publisher.publishProfessionalRiskDetected).toHaveBeenCalledOnce();
    expect(publisher.publishProfessionalRiskResolved).not.toHaveBeenCalled();
  });

  it('detects WATCHLIST risk when count is 9', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(9), publisher);
    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.riskLevel).toBe('WATCHLIST');
    }
  });

  it('detects FLAGGED risk when count reaches 10', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(10), publisher);
    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.riskDetected).toBe(true);
      expect(result.value.riskLevel).toBe('FLAGGED');
      expect(result.value.negativeFeedbackCount).toBe(10);
    }
    expect(publisher.publishProfessionalRiskDetected).toHaveBeenCalledOnce();
    expect(publisher.publishProfessionalRiskResolved).not.toHaveBeenCalled();
  });

  it('detects FLAGGED risk when count is 15 (above threshold)', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(15), publisher);
    const result = await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.riskLevel).toBe('FLAGGED');
    }
  });

  it('publishes event with correct payload at WATCHLIST threshold', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(5), publisher);
    await useCase.execute({ professionalProfileId: 'prof-001' });

    const event = (publisher.publishProfessionalRiskDetected as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(event.payload.professionalProfileId).toBe('prof-001');
    expect(event.payload.riskType).toBe('NEGATIVE_SESSION_FEEDBACK');
    expect(event.payload.negativeFeedbackCount).toBe(5);
    expect(event.payload.windowDays).toBe(30);
    expect(event.payload.threshold).toBe(5);
  });

  it('publishes event with FLAGGED threshold payload', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(10), publisher);
    await useCase.execute({ professionalProfileId: 'prof-001' });

    const event = (publisher.publishProfessionalRiskDetected as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(event.payload.threshold).toBe(10);
  });

  it('queries repo excluding hidden feedbacks', async () => {
    const repo = makeRepoMock(5);
    const useCase = new DetectProfessionalRisk(repo, publisher);
    await useCase.execute({ professionalProfileId: 'prof-001' });

    expect(repo.countNegativeInWindow).toHaveBeenCalledWith('prof-001', 30, false);
  });

  it('rejects empty professionalProfileId', async () => {
    const useCase = new DetectProfessionalRisk(makeRepoMock(0), publisher);
    const result = await useCase.execute({ professionalProfileId: '' });
    expect(result.isLeft()).toBe(true);
  });
});
