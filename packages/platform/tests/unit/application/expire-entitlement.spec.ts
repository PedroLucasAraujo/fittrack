import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { ExpireEntitlement } from '../../../application/use-cases/expire-entitlement.js';
import type { IPlatformEntitlementRepository } from '../../../application/ports/platform-entitlement-repository-port.js';
import type { IPlatformEntitlementEventPublisher } from '../../../application/ports/platform-entitlement-event-publisher-port.js';
import type { IPlatformEntitlementAuditLog } from '../../../application/ports/platform-entitlement-audit-log-port.js';
import type { EntitlementExpired } from '../../../domain/events/entitlement-expired.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEntitlement(
  options: {
    expiresAt?: string | null;
    status?: EntitlementStatus;
  } = {},
): PlatformEntitlement {
  const e = PlatformEntitlement.create(
    generateId(),
    generateId(),
    [EntitlementType.API_ACCESS],
    options.expiresAt ?? null,
    new Date().toISOString(),
  );
  if (options.status === EntitlementStatus.SUSPENDED) e.suspend('test');
  if (options.status === EntitlementStatus.EXPIRED) e.expire();
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

// ── ExpireEntitlement ─────────────────────────────────────────────────────────

describe('ExpireEntitlement', () => {
  let repo: IPlatformEntitlementRepository;
  let publisher: IPlatformEntitlementEventPublisher;
  let auditLog: IPlatformEntitlementAuditLog;
  let useCase: ExpireEntitlement;

  beforeEach(() => {
    repo = makeRepo();
    publisher = makePublisher();
    auditLog = makeAuditLog();
    useCase = new ExpireEntitlement(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('transitions ACTIVE → EXPIRED, saves, and publishes EntitlementExpired', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: pastExpiry });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    expect(entitlement.status).toBe(EntitlementStatus.EXPIRED);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledOnce();
    expect(publisher.publishEntitlementExpired).toHaveBeenCalledOnce();
  });

  it('audit log uses actorId=SYSTEM, actorRole=SYSTEM (automated)', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: pastExpiry });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(auditLog.writePlatformEntitlementChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        previousStatus: EntitlementStatus.ACTIVE,
        newStatus: EntitlementStatus.EXPIRED,
      }),
    );
  });

  it('published event has expiredAt in payload', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: pastExpiry });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    const published = (publisher.publishEntitlementExpired as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as EntitlementExpired;
    expect(published.eventType).toBe('EntitlementExpired');
    expect(published.payload.expiredAt).toBeTruthy();
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when already EXPIRED (idempotent)', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({
      expiresAt: pastExpiry,
      status: EntitlementStatus.EXPIRED,
    });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
    expect(auditLog.writePlatformEntitlementChanged).not.toHaveBeenCalled();
    expect(publisher.publishEntitlementExpired).not.toHaveBeenCalled();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns Left(EntitlementNotFoundError) when entitlement does not exist', async () => {
    const result = await useCase.execute({
      entitlementId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.ENTITLEMENT_NOT_FOUND);
    expect(repo.save).not.toHaveBeenCalled();
  });

  // ── Precondition violations ───────────────────────────────────────────────

  it('returns Left when expiresAt is null (no expiry configured)', async () => {
    const entitlement = makeEntitlement({ expiresAt: null });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns Left when expiresAt is in the future', async () => {
    const futureExpiry = new Date(Date.now() + 86400_000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: futureExpiry });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns Left when entitlement is SUSPENDED (cannot expire suspended)', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({
      expiresAt: pastExpiry,
      status: EntitlementStatus.SUSPENDED,
    });
    repo = makeRepo({ findById: vi.fn().mockResolvedValue(entitlement) });
    useCase = new ExpireEntitlement(repo, publisher, auditLog);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
