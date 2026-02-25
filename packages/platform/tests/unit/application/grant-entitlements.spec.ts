import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { GrantEntitlements } from '../../../application/use-cases/grant-entitlements.js';
import type { IPlatformEntitlementRepository } from '../../../application/ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../../../application/ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../../../application/ports/platform-entitlement-audit-log-port.js';
import type { EntitlementGranted } from '../../../domain/events/entitlement-granted.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-001', actorRole: 'ADMIN' } as const;

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

function makeExistingEntitlement(
  professionalProfileId: string,
  status: EntitlementStatus = EntitlementStatus.ACTIVE,
): PlatformEntitlement {
  const e = PlatformEntitlement.create(
    generateId(),
    professionalProfileId,
    [EntitlementType.API_ACCESS],
    null,
    new Date().toISOString(),
  );
  if (status === EntitlementStatus.SUSPENDED) e.suspend('test');
  return e;
}

// ── GrantEntitlements ─────────────────────────────────────────────────────────

describe('GrantEntitlements', () => {
  let repo: IPlatformEntitlementRepository;
  let publisher: IPlatformEntitlementEventPublisher;
  let auditLog: IPlatformEntitlementAuditLog;
  let useCase: GrantEntitlements;

  beforeEach(() => {
    repo = makeRepo();
    publisher = makePublisher();
    auditLog = makeAuditLog();
    useCase = new GrantEntitlements(repo, publisher, auditLog);
  });

  // ── Success — create new entitlement ──────────────────────────────────────

  it('creates new ACTIVE entitlement when none exists and publishes EntitlementGranted', async () => {
    const professionalProfileId = generateId();
    const result = await useCase.execute({
      professionalProfileId,
      entitlements: [EntitlementType.API_ACCESS, EntitlementType.MULTI_PROFILE],
      reason: 'Initial onboarding grant',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledOnce();
    expect(publisher.publishEntitlementGranted).toHaveBeenCalledOnce();
  });

  it('event payload contains granted capabilities and expiresAt', async () => {
    const professionalProfileId = generateId();
    const expiresAt = new Date(Date.now() + 86400_000).toISOString();

    await useCase.execute({
      professionalProfileId,
      entitlements: [EntitlementType.API_ACCESS],
      expiresAt,
      reason: 'Grant with expiry',
      ...MOCK_ACTOR,
    });

    const published = (publisher.publishEntitlementGranted as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as EntitlementGranted;

    expect(published.eventType).toBe('EntitlementGranted');
    expect(published.aggregateType).toBe('PlatformEntitlement');
    expect(published.tenantId).toBe(professionalProfileId);
    expect(published.payload.entitlements).toContain(EntitlementType.API_ACCESS);
    expect(published.payload.expiresAt).toBe(expiresAt);
  });

  it('audit log has correct actorId, actorRole, and tenantId', async () => {
    const professionalProfileId = generateId();

    await useCase.execute({
      professionalProfileId,
      entitlements: [EntitlementType.API_ACCESS],
      reason: 'Audit check',
      ...MOCK_ACTOR,
    });

    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: MOCK_ACTOR.actorId,
        actorRole: MOCK_ACTOR.actorRole,
        tenantId: professionalProfileId,
        addedCapabilities: [EntitlementType.API_ACCESS],
      }),
    );
  });

  // ── Success — re-grant existing entitlement ───────────────────────────────

  it('re-grants existing ACTIVE entitlement, replacing capabilities', async () => {
    const professionalProfileId = generateId();
    const existing = makeExistingEntitlement(professionalProfileId);
    repo = makeRepo({
      findByProfessionalProfileId: vi.fn().mockResolvedValue(existing),
    });
    useCase = new GrantEntitlements(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      entitlements: [EntitlementType.LONG_TERM_PLANS],
      reason: 'Plan upgrade',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(existing.status).toBe(EntitlementStatus.ACTIVE);
    expect(existing.entitlements).toContain(EntitlementType.LONG_TERM_PLANS);
    expect(existing.entitlements).not.toContain(EntitlementType.API_ACCESS);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('re-grants SUSPENDED entitlement, resetting to ACTIVE', async () => {
    const professionalProfileId = generateId();
    const existing = makeExistingEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo = makeRepo({
      findByProfessionalProfileId: vi.fn().mockResolvedValue(existing),
    });
    useCase = new GrantEntitlements(repo, publisher, auditLog);

    const result = await useCase.execute({
      professionalProfileId,
      entitlements: [EntitlementType.MULTI_PROFILE],
      reason: 'Risk resolved — re-grant',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(existing.status).toBe(EntitlementStatus.ACTIVE);
  });

  it('trims whitespace from reason before publishing', async () => {
    await useCase.execute({
      professionalProfileId: generateId(),
      entitlements: [EntitlementType.API_ACCESS],
      reason: '  Trimmed reason  ',
      ...MOCK_ACTOR,
    });

    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Trimmed reason' }),
    );
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns Left when reason is empty', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      entitlements: [EntitlementType.API_ACCESS],
      reason: '',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
    expect(auditLog.writePlatformEntitlementChanged).not.toHaveBeenCalled();
  });

  it('returns Left when reason exceeds 500 characters', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      entitlements: [EntitlementType.API_ACCESS],
      reason: 'a'.repeat(501),
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns Left when entitlements list is empty', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      entitlements: [],
      reason: 'Valid reason',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
