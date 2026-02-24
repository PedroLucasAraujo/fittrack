import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { BanProfessional } from '../../../application/use-cases/ban-professional.js';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';
import type { IProfessionalRiskRepository } from '../../../application/ports/professional-risk-repository-port.js';
import type { IRiskEventPublisher } from '../../../application/ports/risk-event-publisher-port.js';
import type { IRiskAuditLog } from '../../../application/ports/risk-audit-log-port.js';
import type { RiskStatusChanged } from '@fittrack/identity';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-id-001', actorRole: 'ADMIN' } as const;

function makeProfessionalProfile(
  overrides: Partial<{
    riskStatus: RiskStatus;
    status: ProfessionalProfileStatus;
  }> = {},
): ProfessionalProfile {
  const nameResult = PersonName.create('Dr. Smith');
  return ProfessionalProfile.reconstitute(
    generateId(),
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

function makeAuditLog(overrides: Partial<IRiskAuditLog> = {}): IRiskAuditLog {
  return {
    writeRiskStatusChanged: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── BanProfessional ───────────────────────────────────────────────────────────

describe('BanProfessional', () => {
  let repo: IProfessionalRiskRepository;
  let eventPublisher: IRiskEventPublisher;
  let auditLog: IRiskAuditLog;
  let useCase: BanProfessional;

  beforeEach(() => {
    repo = makeRepo();
    eventPublisher = makeEventPublisher();
    auditLog = makeAuditLog();
    useCase = new BanProfessional(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Success paths ─────────────────────────────────────────────────────────

    it('transitions NORMAL → BANNED, saves, and publishes RiskStatusChanged', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Confirmed fraudulent activity',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.save).toHaveBeenCalledOnce();
      expect(auditLog.writeRiskStatusChanged).toHaveBeenCalledOnce();
      expect(eventPublisher.publishRiskStatusChanged).toHaveBeenCalledOnce();
    });

    it('transitions WATCHLIST → BANNED; event previousStatus reflects WATCHLIST', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Escalation from watchlist after review',
        ...MOCK_ACTOR,
      });

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.payload.previousStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
    });

    it('event payload has correct fields including evidenceRef when provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      const evidenceRef = generateId();
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Chargeback fraud confirmed',
        evidenceRef,
        ...MOCK_ACTOR,
      });

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.eventType).toBe('RiskStatusChanged');
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
      expect(published.payload.reason).toBe('Chargeback fraud confirmed');
      expect(published.payload.evidenceRef).toBe(evidenceRef);
    });

    it('writes AuditLog with actorId=ADMIN, actorRole=ADMIN, previousStatus=NORMAL, newStatus=BANNED', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Confirmed fraud',
        ...MOCK_ACTOR,
      });

      expect(auditLog.writeRiskStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: MOCK_ACTOR.actorId,
          actorRole: MOCK_ACTOR.actorRole,
          targetEntityId: profile.id,
          tenantId: profile.id,
          previousStatus: RiskStatus.NORMAL,
          newStatus: RiskStatus.BANNED,
          reason: 'Confirmed fraud',
        }),
      );
    });

    it('sets evidenceRef to null when not provided in dto', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Admin ban without specific evidence ref',
        ...MOCK_ACTOR,
      });

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.payload.evidenceRef).toBeNull();
    });

    // ── Idempotency — BANNED terminal state ───────────────────────────────────

    it('returns Right(void) without saving or publishing when already BANNED (idempotent)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Re-ban attempt',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    // ── Validation — reason ───────────────────────────────────────────────────

    it('returns Left(InvalidRiskReasonError) when reason is empty', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: '',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.INVALID_REASON);
      }
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    it('returns Left(InvalidRiskReasonError) when reason is whitespace only', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: '   ',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.INVALID_REASON);
      }
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
    });

    it('returns Left(InvalidRiskReasonError) when reason exceeds 500 characters', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: 'b'.repeat(501),
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.INVALID_REASON);
      }
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when profile does not exist', async () => {
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: 'Profile not found test',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.PROFESSIONAL_NOT_FOUND);
      }
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    // ── Aggregate transition failure ──────────────────────────────────────────

    it('returns Left when escalateToBanned fails (DEACTIVATED profile with NORMAL risk)', async () => {
      // A DEACTIVATED profile can have NORMAL/WATCHLIST riskStatus.
      // escalateToBanned() calls ban() which rejects non-bannable statuses.
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.NORMAL,
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new BanProfessional(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Ban on deactivated profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });
  });
});
