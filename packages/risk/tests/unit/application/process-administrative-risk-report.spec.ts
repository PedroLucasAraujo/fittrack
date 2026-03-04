import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import {
  ProfessionalProfile,
  RiskStatus,
  ProfessionalProfileStatus,
  PersonName,
} from '@fittrack/identity';
import { ProcessAdministrativeRiskReport } from '../../../application/use-cases/process-administrative-risk-report.js';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';
import { InMemoryProfessionalRiskRepository } from '../../repositories/in-memory-professional-risk-repository.js';
import { InMemoryRiskEventPublisherStub } from '../../stubs/in-memory-risk-event-publisher-stub.js';
import { InMemoryRiskAuditLogStub } from '../../stubs/in-memory-risk-audit-log-stub.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-id-001', actorRole: 'ADMIN' } as const;
const VALID_REASON = 'Risk escalation following administrative review';

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

// ── ProcessAdministrativeRiskReport ───────────────────────────────────────────

describe('ProcessAdministrativeRiskReport', () => {
  let repo: InMemoryProfessionalRiskRepository;
  let eventPublisher: InMemoryRiskEventPublisherStub;
  let auditLog: InMemoryRiskAuditLogStub;
  let useCase: ProcessAdministrativeRiskReport;

  beforeEach(() => {
    repo = new InMemoryProfessionalRiskRepository();
    eventPublisher = new InMemoryRiskEventPublisherStub();
    auditLog = new InMemoryRiskAuditLogStub();
    useCase = new ProcessAdministrativeRiskReport(repo, eventPublisher, auditLog);
  });

  describe('execute()', () => {
    // ── Reason validation ─────────────────────────────────────────────────────

    it('returns Left(InvalidRiskReasonError) when reason is empty', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        targetRiskStatus: 'WATCHLIST',
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
        targetRiskStatus: 'WATCHLIST',
        reason: '   ',
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.REASON_INVALID);
      }
      expect(repo.saveCount).toBe(0);
    });

    it('returns Right when reason is exactly 500 characters (valid boundary)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: 'a'.repeat(500),
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
    });

    it('returns Left(InvalidRiskReasonError) when reason exceeds 500 characters', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        targetRiskStatus: 'WATCHLIST',
        reason: 'a'.repeat(501),
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.REASON_INVALID);
      }
      expect(repo.saveCount).toBe(0);
    });

    // ── Repository — not found ────────────────────────────────────────────────

    it('returns Left(ProfessionalRiskNotFoundError) when profile does not exist', async () => {
      const result = await useCase.execute({
        professionalProfileId: generateId(),
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
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

    // ── targetRiskStatus = WATCHLIST ──────────────────────────────────────────

    it('escalates NORMAL → WATCHLIST, saves, and publishes event with dto actor', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
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

    it('writes AuditLog with actorId and actorRole from dto (not SYSTEM)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      expect(auditLog.written[0]).toMatchObject({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        targetEntityId: profile.id,
        tenantId: profile.id,
        previousStatus: RiskStatus.NORMAL,
        newStatus: RiskStatus.WATCHLIST,
        reason: VALID_REASON,
      });
    });

    it('returns Right(void) without side effects when profile is already WATCHLIST (idempotent)', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Right(void) without side effects when profile is BANNED and target=WATCHLIST (terminal guard first)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── targetRiskStatus = BANNED ─────────────────────────────────────────────

    it('escalates NORMAL → BANNED, saves, and publishes event', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'BANNED',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(1);
      expect(auditLog.written).toHaveLength(1);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(1);

      const published = eventPublisher.publishedRiskStatusChanged[0];
      if (!published) throw new Error('expected published event');
      expect(published.payload.previousStatus).toBe(RiskStatus.NORMAL);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
    });

    it('escalates WATCHLIST → BANNED; event previousStatus reflects WATCHLIST', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.WATCHLIST });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'BANNED',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      const published = eventPublisher.publishedRiskStatusChanged[0];
      if (!published) throw new Error('expected published event');
      expect(published.payload.previousStatus).toBe(RiskStatus.WATCHLIST);
      expect(published.payload.newStatus).toBe(RiskStatus.BANNED);
    });

    it('returns Right(void) without side effects when profile is already BANNED and target=BANNED', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.BANNED,
        status: ProfessionalProfileStatus.BANNED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'BANNED',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      expect(result.isRight()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    it('returns Left when escalateToBanned fails (DEACTIVATED profile with NORMAL risk)', async () => {
      const profile = makeProfessionalProfile({
        riskStatus: RiskStatus.NORMAL,
        status: ProfessionalProfileStatus.DEACTIVATED,
      });
      repo.items.push(profile);

      const result = await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'BANNED',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      expect(result.isLeft()).toBe(true);
      expect(repo.saveCount).toBe(0);
      expect(auditLog.written).toHaveLength(0);
      expect(eventPublisher.publishedRiskStatusChanged).toHaveLength(0);
    });

    // ── evidenceRef ───────────────────────────────────────────────────────────

    it('sets evidenceRef from dto when provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      const evidenceRef = generateId();
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
        evidenceRef,
        ...MOCK_ACTOR,
      });

      const ev0 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev0) throw new Error('expected published event');
      expect(ev0.payload.evidenceRef).toBe(evidenceRef);
    });

    it('sets evidenceRef to null when not provided', async () => {
      const profile = makeProfessionalProfile({ riskStatus: RiskStatus.NORMAL });
      repo.items.push(profile);

      await useCase.execute({
        professionalProfileId: profile.id,
        targetRiskStatus: 'WATCHLIST',
        reason: VALID_REASON,
        ...MOCK_ACTOR,
      });

      const ev1 = eventPublisher.publishedRiskStatusChanged[0];
      if (!ev1) throw new Error('expected published event');
      expect(ev1.payload.evidenceRef).toBeNull();
    });
  });
});
