import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { AddCapability } from '../../../application/use-cases/add-capability.js';
import type { IPlatformEntitlementRepository } from '../../../application/ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../../../application/ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../../../application/ports/platform-entitlement-audit-log-port.js';
import type { EntitlementCapabilityAdded } from '../../../domain/events/entitlement-capability-added.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-001', actorRole: 'ADMIN' } as const;

function makeEntitlement(
  professionalProfileId: string,
  entitlements: EntitlementType[] = [EntitlementType.API_ACCESS],
  status: EntitlementStatus = EntitlementStatus.ACTIVE,
): PlatformEntitlement {
  const e = PlatformEntitlement.create(
    generateId(),
    professionalProfileId,
    entitlements,
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

// ── AddCapability ─────────────────────────────────────────────────────────────

describe('AddCapability', () => {
  let repo: IPlatformEntitlementRepository;
  let publisher: IPlatformEntitlementEventPublisher;
  let auditLog: IPlatformEntitlementAuditLog;
  let useCase: AddCapability;

  beforeEach(() => {
    repo = makeRepo();
    publisher = makePublisher();
    auditLog = makeAuditLog();
    useCase = new AddCapability(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('adds capability to ACTIVE entitlement and publishes EntitlementCapabilityAdded', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.API_ACCESS]);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new AddCapability(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.MULTI_PROFILE,
      reason: 'Upgrade requested',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledOnce();
    expect(publisher.publishCapabilityAdded).toHaveBeenCalledOnce();

    const published = (publisher.publishCapabilityAdded as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as EntitlementCapabilityAdded;
    expect(published.payload.capability).toBe(EntitlementType.MULTI_PROFILE);
    expect(published.payload.reason).toBe('Upgrade requested');
  });

  it('audit log has addedCapabilities with the new capability', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.API_ACCESS]);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new AddCapability(repo, publisher, auditLog);

    await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.MULTI_PROFILE,
      reason: 'Audit check',
      ...MOCK_ACTOR,
    });

    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        tenantId: professionalProfileId,
        addedCapabilities: [EntitlementType.MULTI_PROFILE],
      }),
    );
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when capability already present (idempotent)', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.API_ACCESS]);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new AddCapability(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Re-add attempt',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
    expect(auditLog.writePlatformEntitlementChanged).not.toHaveBeenCalled();
    expect(publisher.publishCapabilityAdded).not.toHaveBeenCalled();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns Left(EntitlementNotFoundError) when entitlement does not exist', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      capability: EntitlementType.API_ACCESS,
      reason: 'Not found test',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.ENTITLEMENT_NOT_FOUND);
    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── Invalid transitions ───────────────────────────────────────────────────

  it('returns Left when entitlement is SUSPENDED', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [], EntitlementStatus.SUSPENDED);
    repo = makeRepo({ findByProfessionalProfileId: vi.fn().mockResolvedValue(entitlement) });
    useCase = new AddCapability(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Add while suspended',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns Left when reason is empty', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      capability: EntitlementType.API_ACCESS,
      reason: '',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
