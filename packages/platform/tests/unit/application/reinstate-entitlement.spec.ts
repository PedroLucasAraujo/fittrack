import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { ReinstateEntitlement } from '../../../application/use-cases/reinstate-entitlement.js';
import { InMemoryPlatformEntitlementRepository } from '../../repositories/in-memory-platform-entitlement-repository.js';
import { InMemoryPlatformEntitlementEventPublisherStub } from '../../stubs/in-memory-platform-entitlement-event-publisher-stub.js';
import { InMemoryPlatformEntitlementAuditLogStub } from '../../stubs/in-memory-platform-entitlement-audit-log-stub.js';

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

// ── ReinstateEntitlement ──────────────────────────────────────────────────────

describe('ReinstateEntitlement', () => {
  let repo: InMemoryPlatformEntitlementRepository;
  let publisher: InMemoryPlatformEntitlementEventPublisherStub;
  let auditLog: InMemoryPlatformEntitlementAuditLogStub;
  let useCase: ReinstateEntitlement;

  beforeEach(() => {
    repo = new InMemoryPlatformEntitlementRepository();
    publisher = new InMemoryPlatformEntitlementEventPublisherStub();
    auditLog = new InMemoryPlatformEntitlementAuditLogStub();
    useCase = new ReinstateEntitlement(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('transitions SUSPENDED → ACTIVE, saves, and publishes EntitlementReinstated', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Risk resolved',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(entitlement.status).toBe(EntitlementStatus.ACTIVE);
    expect(repo.saveCount).toBe(1);
    expect(auditLog.written).toHaveLength(1);
    expect(publisher.publishedEntitlementReinstated).toHaveLength(1);
  });

  it('event payload has correct reason', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      reason: 'Payment restored',
      ...MOCK_ACTOR,
    });

    const published = publisher.publishedEntitlementReinstated[0];
    expect(published).toBeDefined();
    if (!published) throw new Error('expected published event');
    expect(published.eventType).toBe('EntitlementReinstated');
    expect(published.payload.reason).toBe('Payment restored');
  });

  it('writes AuditLog with previousStatus=SUSPENDED, newStatus=ACTIVE', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      reason: 'Reinstatement check',
      ...MOCK_ACTOR,
    });

    expect(auditLog.written[0]).toMatchObject({
      actorId: MOCK_ACTOR.actorId,
      actorRole: MOCK_ACTOR.actorRole,
      tenantId: professionalProfileId,
      previousStatus: EntitlementStatus.SUSPENDED,
      newStatus: EntitlementStatus.ACTIVE,
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when already ACTIVE (idempotent)', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.ACTIVE);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Re-reinstate attempt',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.saveCount).toBe(0);
    expect(auditLog.written).toHaveLength(0);
    expect(publisher.publishedEntitlementReinstated).toHaveLength(0);
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
    expect(repo.saveCount).toBe(0);
  });

  // ── Invalid transitions ───────────────────────────────────────────────────

  it('returns Left when entitlement is EXPIRED', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, EntitlementStatus.EXPIRED);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      reason: 'Reinstate expired',
      ...MOCK_ACTOR,
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
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.saveCount).toBe(0);
  });
});
