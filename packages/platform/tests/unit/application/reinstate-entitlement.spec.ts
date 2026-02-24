import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { ReinstateEntitlement } from '../../../application/use-cases/reinstate-entitlement.js';
import type { IPlatformEntitlementRepository } from '../../../application/ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../../../application/ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../../../application/ports/platform-entitlement-audit-log-port.js';
import type { EntitlementReinstated } from '../../../domain/events/entitlement-reinstated.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-001', actorRole: 'ADMIN' } as const;

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

// ── ReinstateEntitlement ──────────────────────────────────────────────────────

describe('ReinstateEntitlement', () => {
  let repo: IPlatformEntitlementRepository;
  let publisher: IPlatformEntitlementEventPublisher;
  let auditLog: IPlatformEntitlementAuditLog;
  let useCase: ReinstateEntitlement;

  beforeEach(() => {
    repo = makeRepo();
    publisher = makePublisher();
    auditLog = makeAuditLog();
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('transitions SUSPENDED → ACTIVE, saves, and publishes EntitlementReinstated', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Risk resolved',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(entitlement.status).toBe(EntitlementStatus.ACTIVE);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledOnce();
    expect(publisher.publishEntitlementReinstated).toHaveBeenCalledOnce();
  });

  it('event payload has correct reason', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      professionalProfileId,
      reason: 'Payment restored',
      ...MOCK_ACTOR,
    });

    const published = (publisher.publishEntitlementReinstated as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as EntitlementReinstated;
    expect(published.eventType).toBe('EntitlementReinstated');
    expect(published.payload.reason).toBe('Payment restored');
  });

  it('writes AuditLog with previousStatus=SUSPENDED, newStatus=ACTIVE', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      professionalProfileId,
      reason: 'Reinstatement check',
      ...MOCK_ACTOR,
    });

    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        tenantId: professionalProfileId,
        previousStatus: EntitlementStatus.SUSPENDED,
        newStatus: EntitlementStatus.ACTIVE,
      }),
    );
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when already ACTIVE (idempotent)', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.ACTIVE);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Re-reinstate attempt',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
    expect(auditLog.writePlatformEntitlementChanged).not.toHaveBeenCalled();
    expect(publisher.publishEntitlementReinstated).not.toHaveBeenCalled();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns Left(EntitlementNotFoundError) when entitlement does not exist', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      reason: 'Not found',
      ...MOCK_ACTOR,
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
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Reinstate expired',
      ...MOCK_ACTOR,
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
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
