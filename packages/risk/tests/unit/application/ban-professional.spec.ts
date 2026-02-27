import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { BanProfessional } from '../../../application/use-cases/ban-professional.js';
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

// ── BanProfessional ───────────────────────────────────────────────────────────

describe('BanProfessional', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: BanProfessional;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new BanProfessional(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Success paths ─────────────────────────────────────────────────────────

    it('transitions NORMAL → BANNED, saves, and publishes RiskStatusChanged', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Confirmed fraudulent activity',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);
    });

    it('transitions WATCHLIST → BANNED; event previousStatus reflects WATCHLIST', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Escalation from watchlist after review',
        ...MOCK_ACTOR,
      });

      const published = eventPublisher.publishedRiskStatusChanged[0];
      expect(published.payload.previousStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
    });

    it('event payload has correct fields including evidenceRef when provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      const evidenceRef = generateId();
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Chargeback fraud confirmed',
        evidenceRef,
        ...MOCK_ACTOR,
      });

      const published = eventPublisher.publishedRiskStatusChanged[0];
      expect(published.eventType).toBe('RiskStatusChanged');
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
      expect(published.payload.reason).toBe('Chargeback fraud confirmed');
      expect(published.payload.evidenceRef).toBe(evidenceRef);
    });

    it('writes AuditLog with actorId=ADMIN, actorRole=ADMIN, previousStatus=NORMAL, newStatus=BANNED', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Confirmed fraud',
        ...MOCK_ACTOR,
      });

      expect(auditLog.written[0]).toMatchObject({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        targetEntityId: profile.id,
        tenantId: profile.id,
        previousStatus: RiskStatus.NORMAL,
        newStatus: RiskStatus.BANNED,
        reason: 'Confirmed fraud',
      });
    });

    it('sets evidenceRef to null when not provided in dto', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Admin ban without specific evidence ref',
        ...MOCK_ACTOR,
      });

      expect(eventPublisher.publishedRiskStatusChanged[0].payload.evidenceRef).toBeNull();
    });

    // ── Idempotency — BANNED terminal state ───────────────────────────────────

    it('returns Right(void) without saving or publishing when already BANNED (idempotent)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Re-ban attempt',
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
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
        reason: 'b'.repeat(501),
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
        reason: 'Profile not found test',
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

    // ── Aggregate transition failure ──────────────────────────────────────────

    it('returns Left when escalateToBanned fails (DEACTIVATED profile with NORMAL risk)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.NORMAL,
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        reason: 'Ban on deactivated profile',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });
  });
});
