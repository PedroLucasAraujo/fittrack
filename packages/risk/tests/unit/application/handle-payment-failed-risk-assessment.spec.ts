import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { HandlePaymentFailedRiskAssessment } from '../../../application/use-cases/handle-payment-failed-risk-assessment.js';
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

// ── HandlePaymentFailedRiskAssessment ─────────────────────────────────────────

describe('HandlePaymentFailedRiskAssessment', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: HandlePaymentFailedRiskAssessment;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new HandlePaymentFailedRiskAssessment(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Invalid RiskIndicators ────────────────────────────────────────────────

    it('returns Left(InvalidRiskIndicatorError) when paymentFailureCount is negative', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        paymentFailureCount: -1,
        windowDays: 30,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Left(InvalidRiskIndicatorError) when windowDays = 0', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        paymentFailureCount: 3,
        windowDays: 0,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
      expect(repo.saveCount).toBe(0);
    });

    // ── Threshold not exceeded — early return ─────────────────────────────────

    it('returns Right(void) without repo calls when threshold not exceeded (count=2, limit=3)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        paymentFailureCount: 2,
        windowDays: 30,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Right(void) without repo calls when count = 0 (no failures)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        paymentFailureCount: 0,
        windowDays: 30,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
    });

    // ── NORMAL → WATCHLIST (threshold met) ────────────────────────────────────

    it('escalates NORMAL → WATCHLIST, saves, writes SYSTEM audit, and publishes event', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        paymentFailureCount: 3,
        windowDays: 30,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);

      const published = eventPublisher.publishedRiskStatusChanged[0];
      if (!published) throw new Error('expected published event');
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.WATCHLIST);
    });

    it('writes AuditLog with actorId=SYSTEM and actorRole=SYSTEM (automated action)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        paymentFailureCount: 3,
        windowDays: 30,
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

    it('reason string contains failure count and window days', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        paymentFailureCount: 3,
        windowDays: 30,
      });

      const ev0 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev0) throw new Error('expected published event');
      const reason = ev0.payload.reason as string;
      expect(reason).toContain('3');
      expect(reason).toContain('30');
    });

    it('sets evidenceRef from dto when provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      const evidenceRef = generateId();
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        paymentFailureCount: 3,
        windowDays: 30,
        evidenceRef,
      });

      const ev1 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev1) throw new Error('expected published event');
      expect(ev1.payload.evidenceRef).toBe(evidenceRef);
    });

    it('sets evidenceRef to null when not provided in dto', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        paymentFailureCount: 3,
        windowDays: 30,
      });

      const ev2 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev2) throw new Error('expected published event');
      expect(ev2.payload.evidenceRef).toBeNull();
    });

    // ── Idempotency — WATCHLIST already ──────────────────────────────────────

    it('returns Right(void) without save when profile is already WATCHLIST', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        paymentFailureCount: 3,
        windowDays: 30,
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
        paymentFailureCount: 3,
        windowDays: 30,
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
        paymentFailureCount: 3,
        windowDays: 30,
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
