import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { SuspendEntitlement } from '../../../application/use-cases/suspend-entitlement.js';
import { InMemoryPlatformEntitlementRepository } from '../../repositories/in-memory-platform-entitlement-repository.js';
import { InMemoryPlatformEntitlementEventPublisherStub } from '../../stubs/in-memory-platform-entitlement-event-publisher-stub.js';
import { InMemoryPlatformEntitlementAuditLogStub } from '../../stubs/in-memory-platform-entitlement-audit-log-stub.js';

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

// ── SuspendEntitlement ────────────────────────────────────────────────────────

describe('SuspendEntitlement', () => {
  let repo: InMemoryPlatformEntitlementRepository;
  let publisher: InMemoryPlatformEntitlementEventPublisherStub;
  let auditLog: InMemoryPlatformEntitlementAuditLogStub;
  let useCase: SuspendEntitlement;

  beforeEach(() => {
    repo = new InMemoryPlatformEntitlementRepository();
    publisher = new InMemoryPlatformEntitlementEventPublisherStub();
    auditLog = new InMemoryPlatformEntitlementAuditLogStub();
    useCase = new SuspendEntitlement(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('transitions ACTIVE → SUSPENDED, saves, and publishes EntitlementSuspended', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Risk BANNED',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      evidenceRef: 'risk-event-id-123',
    });

    expect(result.isRight()).toBe(true);
    expect(entitlement.status).toBe(EntitlementStatus.SUSPENDED);
    expect(repo.saveCount).toBe(1);
    expect(auditLog.written).toHaveLength(1);
    expect(publisher.publishedEntitlementSuspended).toHaveLength(1);
  });

  it('event payload has correct reason and evidenceRef', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    const evidenceRef = 'risk-event-id-abc';
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      reason: 'Risk BANNED triggered suspension',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      evidenceRef,
    });

    const published = publisher.publishedEntitlementSuspended[0];
    expect(published).toBeDefined();
    expect(published.eventType).toBe('EntitlementSuspended');
    expect(published.payload.reason).toBe('Risk BANNED triggered suspension');
    expect(published.payload.evidenceRef).toBe(evidenceRef);
  });

  it('writes AuditLog with actorId=SYSTEM for automated suspension', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      reason: 'Automated risk suspension',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(auditLog.written[0]).toMatchObject({
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
      tenantId: professionalProfileId,
      previousStatus: EntitlementStatus.ACTIVE,
      newStatus: EntitlementStatus.SUSPENDED,
    });
  });

  it('sets evidenceRef to null when not provided', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      reason: 'Admin suspension without evidence',
      actorId: 'admin-001',
      actorRole: 'ADMIN',
    });

    const published = publisher.publishedEntitlementSuspended[0];
    expect(published.payload.evidenceRef).toBeNull();
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when already SUSPENDED (idempotent)', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Re-suspend attempt',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.saveCount).toBe(0);
    expect(auditLog.written).toHaveLength(0);
    expect(publisher.publishedEntitlementSuspended).toHaveLength(0);
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
    expect(repo.saveCount).toBe(0);
  });

  // ── Invalid transitions ───────────────────────────────────────────────────

  it('returns Left when entitlement is EXPIRED', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.EXPIRED);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Suspend expired',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.saveCount).toBe(0);
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
    expect(repo.saveCount).toBe(0);
    expect(auditLog.written).toHaveLength(0);
  });

  it('returns Left when reason is whitespace only', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      reason: '   ',
      actorId: 'SYSTEM',
      actorRole: 'SYSTEM',
    });

    expect(result.isLeft()).toBe(true);
    expect(repo.saveCount).toBe(0);
  });
});
