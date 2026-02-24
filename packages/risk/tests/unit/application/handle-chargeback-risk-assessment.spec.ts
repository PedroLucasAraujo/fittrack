import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import type { IProfessionalRiskRepository } from '../../../application/ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../../../application/ports/risk-event-publisher-port.js';
import type { RiskStatusChanged } from '@fittrack/identity';

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

function makeRepo(
  overrides: Partial<IProfessionalRiskRepository> = {},
): IProfessionalRiskRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeEventPublisher(overrides: Partial<IRiskEventPublisher> = {}): IRiskEventPublisher {
  return {
    publishRiskStatusChanged: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── HandleChargebackRiskAssessment ────────────────────────────────────────────

describe('HandleChargebackRiskAssessment', () => {
  let repo: IProfessionalRiskRepository;
  let eventPublisher: IRiskEventPublisher;
  let useCase: HandleChargebackRiskAssessment;

  beforeEach(() => {
    repo = makeRepo();
    eventPublisher = makeEventPublisher();
    useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);
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

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(repo.save).toHaveBeenCalledOnce();
      expect(eventPublisher.publishRiskStatusChanged).toHaveBeenCalledOnce();

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.WATCHLIST);
    });

    it('sets evidenceRef to transactionId (event.aggregateId) on NORMAL chargeback', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      await useCase.execute(event);

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.payload.evidenceRef).toBe(transactionId);
    });

    it('reason contains transactionId reference on NORMAL → WATCHLIST', async () => {
      const professionalProfileId = generateId();
      const transactionId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId, transactionId });

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      await useCase.execute(event);

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.payload.reason).toContain(transactionId);
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

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(repo.save).toHaveBeenCalledOnce();

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

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

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      await useCase.execute(event);

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.payload.evidenceRef).toBe(transactionId);
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

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(repo.save).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when tenantId does not match a profile', async () => {
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);
      const event = makeChargebackRegisteredEvent({ professionalProfileId: generateId() });

      const result = await useCase.execute(event);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.PROFESSIONAL_NOT_FOUND);
      }
      expect(repo.save).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    // ── Aggregate transition failure ──────────────────────────────────────────

    it('returns Left when escalateToBanned fails (WATCHLIST + DEACTIVATED profile)', async () => {
      // A DEACTIVATED profile can have WATCHLIST riskStatus.
      // escalateToBanned() calls ban() which rejects DEACTIVATED status.
      const professionalProfileId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.WATCHLIST,
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId });

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      const result = await useCase.execute(event);

      expect(result.isLeft()).toBe(true);
      expect(repo.save).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    // ── Loads profile by event.tenantId ──────────────────────────────────────

    it('loads profile using event.tenantId as professionalProfileId', async () => {
      const professionalProfileId = generateId();
      const profile = makeProfessionalProfile({
        id: professionalProfileId,
        riskStatus: RiskStatus.NORMAL,
      });
      const event = makeChargebackRegisteredEvent({ professionalProfileId });

      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new HandleChargebackRiskAssessment(repo, eventPublisher);

      await useCase.execute(event);

      expect(repo.findById).toHaveBeenCalledWith(professionalProfileId);
    });
  });
});
