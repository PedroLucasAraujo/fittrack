import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { SuspendEntitlement } from '../../../application/use-cases/suspend-entitlement.js';
import type { IPlatformEntitlementRepository } from '../../../application/ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../../../application/ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../../../application/ports/platform-entitlement-audit-log-port.js';
import type { EntitlementSuspended } from '../../../domain/events/entitlement-suspended.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEntitlement(
  professionalProfileId: string,
  status: EntitlementStatus = EntitlementStatus.ACTIVE,
): PlatformEntitlement {
  const e = PlatformEntitlement.create(
    generateId(),
    professionalProfileId,
    [EntitlementType.API_ACCESS, EntitlementType.MULTI_PROFILE],
    null,
    new Date().toISOString(),
  );
  if (status === EntitlementStatus.SUSPENDED) e.suspend('test');
  if (status === EntitlementStatus.EXPIRED) e.expire();
  return e;
}

function makeRepo(
  overrides: Partial<IPlatformEntitlementRepository> = {},
): IPlatformEntitlementRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByProfessionalProfileId: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePublisher(
  overrides: Partial<IPlatformEntitlementEventPublisher> = {},
): IPlatformEntitlementEventPublisher {
  return {
    publishEntitlementGranted: vi.fn().mockResolvedValue(undefined),
    publishCapabilityAdded: vi.fn().mockResolvedValue(undefined),
    publishCapabilityRemoved: vi.fn().mockResolvedValue(undefined),
    publishEntitlementSuspended: vi.fn().mockResolvedValue(undefined),
    publishEntitlementReinstated: vi.fn().mockResolvedValue(undefined),
    publishEntitlementExpired: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeAuditLog(
  overrides: Partial<IPlatformEntitlementAuditLog> = {},
): IPlatformEntitlementAuditLog {
  return {
    writePlatformEntitlementChanged: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── SuspendEntitlement ────────────────────────────────────────────────────────

describe('SuspendEntitlement', () => {
  let repo: IPlatformEntitlementRepository;
  let publisher: IPlatformEntitlementEventPublisher;
  let auditLog: IPlatformEntitlementAuditLog;
  let useCase: SuspendEntitlement;

  beforeEach(() => {
    repo = makeRepo();
    publisher = makePublisher();
    auditLog = makeAuditLog();
    useCase = new SuspendEntitlement(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('transitions ACTIVE → SUSPENDED, saves, and publishes EntitlementSuspended', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new SuspendEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Risk BANNED',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      evidenceRef: 'risk-event-id-123',
    });

    expect(result.isRight()).toBe(true);
    expect(entitlement.status).toBe(EntitlementStatus.SUSPENDED);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledOnce();
    expect(publisher.publishEntitlementSuspended).toHaveBeenCalledOnce();
  });

  it('event payload has correct reason and evidenceRef', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    const evidenceRef = 'risk-event-id-abc';
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new SuspendEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      professionalProfileId,
      reason: 'Risk BANNED triggered suspension',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      evidenceRef,
    });

    const published = (publisher.publishEntitlementSuspended as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as EntitlementSuspended;
    expect(published.eventType).toBe('EntitlementSuspended');
    expect(published.payload.reason).toBe('Risk BANNED triggered suspension');
    expect(published.payload.evidenceRef).toBe(evidenceRef);
  });

  it('writes AuditLog with actorId=SYSTEM for automated suspension', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new SuspendEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      professionalProfileId,
      reason: 'Automated risk suspension',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        tenantId: professionalProfileId,
        previousStatus: EntitlementStatus.ACTIVE,
        newStatus: EntitlementStatus.SUSPENDED,
      }),
    );
  });

  it('sets evidenceRef to null when not provided', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new SuspendEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      professionalProfileId,
      reason: 'Admin suspension without evidence',
      actorId: 'admin-001',
      actorRole: 'ADMIN',
    });

    const published = (publisher.publishEntitlementSuspended as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as EntitlementSuspended;
    expect(published.payload.evidenceRef).toBeNull();
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when already SUSPENDED (idempotent)', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new SuspendEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Re-suspend attempt',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
    expect(auditLog.writePlatformEntitlementChanged).not.toHaveBeenCalled();
    expect(publisher.publishEntitlementSuspended).not.toHaveBeenCalled();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns Left(EntitlementNotFoundError) when entitlement does not exist', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      reason: 'Not found',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.ENTITLEMENT_NOT_FOUND);
    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── Invalid transitions ───────────────────────────────────────────────────

  it('returns Left when entitlement is EXPIRED', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.EXPIRED);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new SuspendEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Suspend expired',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns Left when reason is empty', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      reason: '',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
    expect(auditLog.writePlatformEntitlementChanged).not.toHaveBeenCalled();
  });

  it('returns Left when reason is whitespace only', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      reason: '   ',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isLeft()).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
