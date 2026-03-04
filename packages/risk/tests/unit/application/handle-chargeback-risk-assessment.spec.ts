import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { ChargebackRegistered } from '@fittrack/billing';
import { HandleChargebackRiskAssessment } from '../../../application/use-cases/handle-chargeback-risk-assessment.js';
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

function makeChargebackRegisteredEvent(
  overrides: Partial<{
    transactionId: string;
    professionalProfileId: string;
    clientId: string;
    servicePlanId: string;
  }> = {},
): ChargebackRegistered {
  return new ChargebackRegistered(
    overrides.transactionId ?? generateId(), // aggregateId = transactionId
    overrides.professionalProfileId ?? generateId(), // tenantId = professionalProfileId
    {
      clientId: overrides.clientId ?? generateId(),
      servicePlanId: overrides.servicePlanId ?? generateId(),
      amountCents: 9900,
      currency: 'BRL',
    },
  );
}

// ── HandleChargebackRiskAssessment ────────────────────────────────────────────

describe('HandleChargebackRiskAssessment', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: HandleChargebackRiskAssessment;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new HandleChargebackRiskAssessment(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── NORMAL → WATCHLIST (first chargeback) ─────────────────────────────────

    it('escalates NORMAL → WATCHLIST on first chargeback and publishes event', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });
      repo.items.push(profile);

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);

      const published = eventPublisher.publishedRiskStatusChanged[0];
      if (!published) throw new Error('expected published event');
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.WATCHLIST);
    });

    it('writes AuditLog with actorId=SYSTEM, actorRole=SYSTEM on automated chargeback escalation', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });
      repo.items.push(profile);

      await useCase.execute(event);

      expect(auditLog.written[0]).toMatchObject({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        targetEntityId: professionalProfileId,
        tenantId: professionalProfileId,
        previousStatus: RiskStatus.NORMAL,
        newStatus: RiskStatus.WATCHLIST,
      });
    });

    it('sets evidenceRef to transactionId (event.aggregateId) on NORMAL chargeback', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });
      repo.items.push(profile);

      await useCase.execute(event);

      const ev0 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev0) throw new Error('expected published event');
      expect(ev0.payload.evidenceRef).toBe(transactionId);
    });

    it('reason contains transactionId reference on NORMAL → WATCHLIST', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });
      repo.items.push(profile);

      await useCase.execute(event);

      const ev1 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev1) throw new Error('expected published event');
      expect(ev1.payload.reason).toContain(transactionId);
    });

    // ── WATCHLIST → BANNED (repeated chargeback) ──────────────────────────────

    it('escalates WATCHLIST → BANNED on subsequent chargeback and publishes event', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.WATCHLIST,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });
      repo.items.push(profile);

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);

      const published = eventPublisher.publishedRiskStatusChanged[0];
      if (!published) throw new Error('expected published event');
      expect(published.payload.previousStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
    });

    it('sets evidenceRef to transactionId on WATCHLIST → BANNED', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.WATCHLIST,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });
      repo.items.push(profile);

      await useCase.execute(event);

      const ev2 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev2) throw new Error('expected published event');
      expect(ev2.payload.evidenceRef).toBe(transactionId);
    });

    // ── Idempotency — BANNED terminal state ───────────────────────────────────

    it('returns Right(void) without saving or publishing when already BANNED (idempotent)', async () => {
      const professionalProfileId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId });
      repo.items.push(profile);

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when tenantId does not match a profile', async () => {
      const event = makeChargebackRegisteredEvent({ professionalProfileId: generateId() });

      const result = await useCase.execute(event);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.PROFESSIONAL_NOT_FOUND);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── Aggregate transition failure ──────────────────────────────────────────

    it('returns Left when escalateToBanned fails (WATCHLIST + DEACTIVATED profile)', async () => {
      const professionalProfileId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.WATCHLIST,
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId });
      repo.items.push(profile);

      const result = await useCase.execute(event);

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── Loads profile by event.tenantId ──────────────────────────────────────

    it('loads profile using event.tenantId as professionalProfileId', async () => {
      const professionalProfileId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId });
      repo.items.push(profile);

      await useCase.execute(event);

      expect(repo.items.find((p) => p.id === professionalProfileId)).toBeDefined();
    });
  });
});
