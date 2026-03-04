import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { HandleHighCancellationRateAssessment } from '../../../application/use-cases/handle-high-cancellation-rate-assessment.js';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';
import { InMemoryProfessionalRiskRepository } from '../../repositories/in-memory-professional-risk-repository.js';
import { InMemoryRiskEventPublisherStub } from '../../stubs/in-memory-risk-event-publisher-stub.js';
import { InMemoryRiskAuditLogStub } from '../../stubs/in-memory-risk-audit-log-stub.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProfessionalProfile(
  overrides: Partial<{
    id: string;
    riskStatus: RiskStatus;
    status: ProfessionalProfileStatus;
  }> = {},
): ProfessionalProfile {
  const nameResult = PersonName.create('Dr. Smith');
  return ProfessionalProfile.reconstitute(
    overrides.id ?? generateId(),
    {
      userId: generateId(),
      displayName: nameResult.value as PersonName,
      status: overrides.status ?? ProfessionalProfileStatus.ACTIVE,
      riskStatus: overrides.riskStatus ?? RiskStatus.NORMAL,
      createdAtUtc: UTCDateTime.now(),
      bannedAtUtc: null,
      bannedReason: null,
      deactivatedAtUtc: null,
      closedAtUtc: null,
      closedReason: null,
      suspendedAtUtc: null,
    },
    0,
  );
}

// ── HandleHighCancellationRateAssessment ──────────────────────────────────────

describe('HandleHighCancellationRateAssessment', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: HandleHighCancellationRateAssessment;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new HandleHighCancellationRateAssessment(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Invalid RiskIndicators ────────────────────────────────────────────────

    it('returns Left(InvalidRiskIndicatorError) when cancellationRate = -0.1 (below 0)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: -0.1,
        windowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Left(InvalidRiskIndicatorError) when cancellationRate = 1.5 (above 1)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: 1.5,
        windowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
      expect(repo.saveCount).toBe(0);
    });

    it('returns Left(InvalidRiskIndicatorError) when windowDays = 0', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: 0.31,
        windowDays: 0,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
      expect(repo.saveCount).toBe(0);
    });

    // ── Threshold not exceeded — early return ─────────────────────────────────

    it('returns Right(void) without repo calls when rate = limit exactly (boundary: 0.30, exclusive)', async () => {
      // Critical boundary test: exclusive comparison means rate=limit does NOT trigger
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: 0.3,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Right(void) without repo calls when rate < limit (rate=0.20, limit=0.30)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: 0.2,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
    });

    it('returns Right(void) without repo calls when rate = 0 (no cancellations)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: 0,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
    });

    // ── NORMAL → WATCHLIST (threshold exceeded) ───────────────────────────────

    it('escalates NORMAL → WATCHLIST, saves, writes SYSTEM audit, and publishes event', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);

      const published = eventPublisher.publishedRiskStatusChanged[0];
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.WATCHLIST);
    });

    it('writes AuditLog with actorId=SYSTEM and actorRole=SYSTEM (automated action)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(auditLog.written[0]).toMatchObject({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        targetEntityId: profile.id,
        tenantId: profile.id,
        previousStatus: RiskStatus.NORMAL,
        newStatus: RiskStatus.WATCHLIST,
      });
    });

    it('reason string contains percentage and window days', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      const reason = eventPublisher.publishedRiskStatusChanged[0].payload.reason as string;
      expect(reason).toContain('31.0%');
      expect(reason).toContain('14');
    });

    it('sets evidenceRef from dto when provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      const evidenceRef = generateId();
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
        evidenceRef,
      });

      expect(eventPublisher.publishedRiskStatusChanged[0].payload.evidenceRef).toBe(evidenceRef);
    });

    it('sets evidenceRef to null when not provided in dto', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(eventPublisher.publishedRiskStatusChanged[0].payload.evidenceRef).toBeNull();
    });

    // ── Idempotency — WATCHLIST already ──────────────────────────────────────

    it('returns Right(void) without save when profile is already WATCHLIST', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── Idempotency — BANNED terminal ─────────────────────────────────────────

    it('returns Right(void) without save when profile is already BANNED', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when profile does not exist', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.PROFESSIONAL_NOT_FOUND);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });
  });
});
