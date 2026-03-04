import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { ExpireEntitlement } from '../../../application/use-cases/expire-entitlement.js';
import { InMemoryPlatformEntitlementRepository } from '../../repositories/in-memory-platform-entitlement-repository.js';
import { InMemoryPlatformEntitlementEventPublisherStub } from '../../stubs/in-memory-platform-entitlement-event-publisher-stub.js';
import { InMemoryPlatformEntitlementAuditLogStub } from '../../stubs/in-memory-platform-entitlement-audit-log-stub.js';

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

// ── ExpireEntitlement ─────────────────────────────────────────────────────────

describe('ExpireEntitlement', () => {
  let repo: InMemoryPlatformEntitlementRepository;
  let publisher: InMemoryPlatformEntitlementEventPublisherStub;
  let auditLog: InMemoryPlatformEntitlementAuditLogStub;
  let useCase: ExpireEntitlement;

  beforeEach(() => {
    repo = new InMemoryPlatformEntitlementRepository();
    publisher = new InMemoryPlatformEntitlementEventPublisherStub();
    auditLog = new InMemoryPlatformEntitlementAuditLogStub();
    useCase = new ExpireEntitlement(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('transitions ACTIVE → EXPIRED, saves, and publishes EntitlementExpired', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: pastExpiry });
    repo.items.push(entitlement);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    expect(entitlement.status).toBe(EntitlementStatus.EXPIRED);
    expect(repo.saveCount).toBe(1);
    expect(auditLog.written).toHaveLength(1);
    expect(publisher.publishedEntitlementExpired).toHaveLength(1);
  });

  it('audit log uses actorId=SYSTEM, actorRole=SYSTEM (automated)', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: pastExpiry });
    repo.items.push(entitlement);

    await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(auditLog.written[0]).toMatchObject({
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      previousStatus: EntitlementStatus.ACTIVE,
      newStatus: EntitlementStatus.EXPIRED,
    });
  });

  it('published event has expiredAt in payload', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: pastExpiry });
    repo.items.push(entitlement);

    await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    const published = publisher.publishedEntitlementExpired[0];
    expect(published).toBeDefined();
    if (!published) throw new Error('expected published event');
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
    repo.items.push(entitlement);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.saveCount).toBe(0);
    expect(auditLog.written).toHaveLength(0);
    expect(publisher.publishedEntitlementExpired).toHaveLength(0);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns Left(EntitlementNotFoundError) when entitlement does not exist', async () => {
    const result = await useCase.execute({
      entitlementId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.ENTITLEMENT_NOT_FOUND);
    expect(repo.saveCount).toBe(0);
  });

  // ── Precondition violations ───────────────────────────────────────────────

  it('returns Left when expiresAt is null (no expiry configured)', async () => {
    const entitlement = makeEntitlement({ expiresAt: null });
    repo.items.push(entitlement);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.saveCount).toBe(0);
  });

  it('returns Left when expiresAt is in the future', async () => {
    const futureExpiry = new Date(Date.now() + 86400_000).toISOString();
    const entitlement = makeEntitlement({ expiresAt: futureExpiry });
    repo.items.push(entitlement);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.saveCount).toBe(0);
  });

  it('returns Left when entitlement is SUSPENDED (cannot expire suspended)', async () => {
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const entitlement = makeEntitlement({
      expiresAt: pastExpiry,
      status: EntitlementStatus.SUSPENDED,
    });
    repo.items.push(entitlement);

    const result = await useCase.execute({
      entitlementId: entitlement.id,
      professionalProfileId: entitlement.professionalProfileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.saveCount).toBe(0);
  });
});
