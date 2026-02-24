import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { ResolveWatchlist } from '../../../application/use-cases/resolve-watchlist.js';
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

// ── ResolveWatchlist ──────────────────────────────────────────────────────────

describe('ResolveWatchlist', () => {
  let repo: IProfessionalRiskRepository;
  let eventPublisher: IRiskEventPublisher;
  let auditLog: IRiskAuditLog;
  let useCase: ResolveWatchlist;

  beforeEach(() => {
    repo = makeRepo();
    eventPublisher = makeEventPublisher();
    auditLog = makeAuditLog();
    useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Success paths ─────────────────────────────────────────────────────────

    it('transitions WATCHLIST → NORMAL and publishes RiskStatusChanged', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Admin review passed — no further violations',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.save).toHaveBeenCalledOnce();
      expect(auditLog.writeRiskStatusChanged).toHaveBeenCalledOnce();
      expect(eventPublisher.publishRiskStatusChanged).toHaveBeenCalledOnce();
    });

    it('event payload has correct previousStatus=WATCHLIST, newStatus=NORMAL, evidenceRef=null', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Risk cleared by compliance team',
        ...MOCK_ACTOR,
      });

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;

      expect(published.eventType).toBe('RiskStatusChanged');
      expect(published.aggregateType).toBe('ProfessionalProfile');
      expect(published.payload.previousStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.newStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.reason).toBe('Risk cleared by compliance team');
      expect(published.payload.evidenceRef).toBeNull();
    });

    it('writes AuditLog with correct actorId, actorRole, targetEntityId, and status transition', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Risk cleared by compliance team',
        ...MOCK_ACTOR,
      });

      expect(auditLog.writeRiskStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: MOCK_ACTOR.actorId,
          actorRole: MOCK_ACTOR.actorRole,
          targetEntityId: profile.id,
          tenantId: profile.id,
          previousStatus: RiskStatus.WATCHLIST,
          newStatus: RiskStatus.NORMAL,
          reason: 'Risk cleared by compliance team',
        }),
      );
    });

    it('trims whitespace from reason before validating and publishing', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: '  Review complete  ',
        ...MOCK_ACTOR,
      });

      const published = (eventPublisher.publishRiskStatusChanged as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as RiskStatusChanged;
      expect(published.payload.reason).toBe('Review complete');
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
        reason: '\t\n  ',
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
        reason: 'x'.repeat(501),
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
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: 'Resolving watchlist',
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

    // ── Invalid transitions ───────────────────────────────────────────────────

    it('returns Left when profile is NORMAL (not WATCHLIST — invalid transition)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Tried to resolve non-watchlisted profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });

    it('returns Left when profile is BANNED (not WATCHLIST — invalid transition)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(profile) });
      useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Tried to resolve banned profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.save).not.toHaveBeenCalled();
      expect(auditLog.writeRiskStatusChanged).not.toHaveBeenCalled();
      expect(eventPublisher.publishRiskStatusChanged).not.toHaveBeenCalled();
    });
  });
});
