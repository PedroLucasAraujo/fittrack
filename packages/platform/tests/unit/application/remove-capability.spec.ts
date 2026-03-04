import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { RemoveCapability } from '../../../application/use-cases/remove-capability.js';
import { InMemoryPlatformEntitlementRepository } from '../../repositories/in-memory-platform-entitlement-repository.js';
import { InMemoryPlatformEntitlementEventPublisherStub } from '../../stubs/in-memory-platform-entitlement-event-publisher-stub.js';
import { InMemoryPlatformEntitlementAuditLogStub } from '../../stubs/in-memory-platform-entitlement-audit-log-stub.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-001', actorRole: 'ADMIN' } as const;

function makeEntitlement(
  professionalProfileId: string,
  entitlements: EntitlementType[] = [EntitlementType.API_ACCESS, EntitlementType.MULTI_PROFILE],
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

// ── RemoveCapability ──────────────────────────────────────────────────────────

describe('RemoveCapability', () => {
  let repo: InMemoryPlatformEntitlementRepository;
  let publisher: InMemoryPlatformEntitlementEventPublisherStub;
  let auditLog: InMemoryPlatformEntitlementAuditLogStub;
  let useCase: RemoveCapability;

  beforeEach(() => {
    repo = new InMemoryPlatformEntitlementRepository();
    publisher = new InMemoryPlatformEntitlementEventPublisherStub();
    auditLog = new InMemoryPlatformEntitlementAuditLogStub();
    useCase = new RemoveCapability(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('removes capability from ACTIVE entitlement and publishes EntitlementCapabilityRemoved', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Downgrade requested',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.saveCount).toBe(1);
    expect(auditLog.written).toHaveLength(1);
    expect(publisher.publishedCapabilityRemoved).toHaveLength(1);

    const published = publisher.publishedCapabilityRemoved[0];
    if (!published) throw new Error('expected published event');
    expect(published.payload.capability).toBe(EntitlementType.API_ACCESS);
    expect(published.payload.reason).toBe('Downgrade requested');
  });

  it('audit log has removedCapabilities with the removed capability', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId);
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Audit check',
      ...MOCK_ACTOR,
    });

    expect(auditLog.written[0]).toMatchObject({
      actorId: MOCK_ACTOR.actorId,
      actorRole: MOCK_ACTOR.actorRole,
      tenantId: professionalProfileId,
      removedCapabilities: [EntitlementType.API_ACCESS],
    });
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns Left(EntitlementNotFoundError) when entitlement does not exist', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      capability: EntitlementType.API_ACCESS,
      reason: 'Not found',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.ENTITLEMENT_NOT_FOUND);
    expect(repo.saveCount).toBe(0);
  });

  // ── Domain errors ─────────────────────────────────────────────────────────

  it('returns Left when capability is not present in entitlement', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.MULTI_PROFILE]);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Absent capability',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(PlatformErrorCodes.INVALID_TRANSITION);
    expect(repo.saveCount).toBe(0);
  });

  it('returns Left when entitlement is SUSPENDED', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(
      professionalProfileId,
      [EntitlementType.API_ACCESS],
      EntitlementStatus.SUSPENDED,
    );
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Remove while suspended',
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    expect(repo.saveCount).toBe(0);
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
    expect(repo.saveCount).toBe(0);
  });

  it('returns Left when reason exceeds 500 characters', async () => {
    const result = await useCase.execute({
      professionalProfileId: generateId(),
      capability: EntitlementType.API_ACCESS,
      reason: 'x'.repeat(501),
      ...MOCK_ACTOR,
    });

    expect(result.isLeft()).toBe(true);
    expect(repo.saveCount).toBe(0);
  });
});
