import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { EscalateToWatchlist } from '../../../application/use-cases/escalate-to-watchlist.js';
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

// ── EscalateToWatchlist ───────────────────────────────────────────────────────

describe('EscalateToWatchlist', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: EscalateToWatchlist;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new EscalateToWatchlist(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Success paths ─────────────────────────────────────────────────────────

    it('transitions NORMAL → WATCHLIST and publishes RiskStatusChanged', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Suspicious refund pattern detected',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);
    });

    it('event payload has correct previousStatus=NORMAL, newStatus=WATCHLIST, reason', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Admin review flagged',
        ...MOCK_ACTOR,
      });

      const published = eventPublisher.publishedRiskStatusChanged[0];
      expect(published.eventType).toBe('RiskStatusChanged');
      expect(published.aggregateType).toBe('ProfessionalProfile');
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.reason).toBe('Admin review flagged');
      expect(published.payload.evidenceRef).toBeNull();
    });

    it('writes AuditLog with correct actorId, actorRole, targetEntityId, and status transition', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Admin review flagged',
        ...MOCK_ACTOR,
      });

      expect(auditLog.written[0]).toMatchObject({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        targetEntityId: profile.id,
        tenantId: profile.id,
        previousStatus: RiskStatus.NORMAL,
        newStatus: RiskStatus.WATCHLIST,
        reason: 'Admin review flagged',
      });
    });

    it('sets evidenceRef from dto when provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      const evidenceRef = generateId();
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Evidence-backed escalation',
        evidenceRef,
        ...MOCK_ACTOR,
      });

      expect(eventPublisher.publishedRiskStatusChanged[0].payload.evidenceRef).toBe(evidenceRef);
    });

    it('trims whitespace from reason before validating and publishing', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: '  Valid reason after trim  ',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(eventPublisher.publishedRiskStatusChanged[0].payload.reason).toBe(
        'Valid reason after trim',
      );
    });

    // ── Validation — reason ───────────────────────────────────────────────────

    it('returns Left(InvalidRiskReasonError) when reason is empty string', async () => {
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

    it('returns Left(InvalidRiskReasonError) when reason is blank (whitespace only)', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: '   ',
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
        reason: 'a'.repeat(501),
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.REASON_INVALID);
      }
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
    });

    it('accepts a reason of exactly 500 characters', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'a'.repeat(500),
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(auditLog.written).toHaveLength(1);
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when profile does not exist', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        reason: 'Valid reason',
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

    it('returns Left when profile is already WATCHLIST (invalid transition)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Attempted re-escalation',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Left when profile is already BANNED (invalid transition)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Attempted escalation on banned profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });
  });
});
