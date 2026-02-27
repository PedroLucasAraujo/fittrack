import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { ResolveWatchlist } from '../../../application/use-cases/resolve-watchlist.js';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';
import { InMemoryProfessionalRiskRepository } from '../../repositories/in-memory-professional-risk-repository.js';
import { InMemoryRiskEventPublisherStub } from '../../stubs/in-memory-risk-event-publisher-stub.js';
import { InMemoryRiskAuditLogStub } from '../../stubs/in-memory-risk-audit-log-stub.js';

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

// ── ResolveWatchlist ──────────────────────────────────────────────────────────

describe('ResolveWatchlist', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: ResolveWatchlist;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new ResolveWatchlist(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Success paths ─────────────────────────────────────────────────────────

    it('transitions WATCHLIST → NORMAL and publishes RiskStatusChanged', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Admin review passed — no further violations',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);
    });

    it('event payload has correct previousStatus=WATCHLIST, newStatus=NORMAL, evidenceRef=null', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Risk cleared by compliance team',
        ...MOCK_ACTOR,
      });

      const published = eventPublisher.publishedRiskStatusChanged[0];
      expect(published.eventType).toBe('RiskStatusChanged');
      expect(published.aggregateType).toBe('ProfessionalProfile');
      expect(published.payload.previousStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.newStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.reason).toBe('Risk cleared by compliance team');
      expect(published.payload.evidenceRef).toBeNull();
    });

    it('writes AuditLog with correct actorId, actorRole, targetEntityId, and status transition', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Risk cleared by compliance team',
        ...MOCK_ACTOR,
      });

      expect(auditLog.written[0]).toMatchObject({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        targetEntityId: profile.id,
        tenantId: profile.id,
        previousStatus: RiskStatus.WATCHLIST,
        newStatus: RiskStatus.NORMAL,
        reason: 'Risk cleared by compliance team',
      });
    });

    it('trims whitespace from reason before validating and publishing', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: '  Review complete  ',
        ...MOCK_ACTOR,
      });

      expect(eventPublisher.publishedRiskStatusChanged[0].payload.reason).toBe('Review complete');
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
        expect(result.value.code).toBe(RiskErrorCodes.REASON_INVALID);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Left(InvalidRiskReasonError) when reason is whitespace only', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: '\t\n  ',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.REASON_INVALID);
      }
      expect(auditLog.written).toHaveLength(0);
    });

    it('returns Left(InvalidRiskReasonError) when reason exceeds 500 characters', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: 'x'.repeat(501),
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.REASON_INVALID);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when profile does not exist', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: 'Resolving watchlist',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.PROFESSIONAL_NOT_FOUND);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── Invalid transitions ───────────────────────────────────────────────────

    it('returns Left when profile is NORMAL (not WATCHLIST — invalid transition)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Tried to resolve non-watchlisted profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Left when profile is BANNED (not WATCHLIST — invalid transition)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Tried to resolve banned profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });
  });
});
