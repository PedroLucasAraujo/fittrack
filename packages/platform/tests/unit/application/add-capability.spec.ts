import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { AddCapability } from '../../../application/use-cases/add-capability.js';
import { InMemoryPlatformEntitlementRepository } from '../../repositories/in-memory-platform-entitlement-repository.js';
import { InMemoryPlatformEntitlementEventPublisherStub } from '../../stubs/in-memory-platform-entitlement-event-publisher-stub.js';
import { InMemoryPlatformEntitlementAuditLogStub } from '../../stubs/in-memory-platform-entitlement-audit-log-stub.js';

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

// ── AddCapability ─────────────────────────────────────────────────────────────

describe('AddCapability', () => {
  let repo: InMemoryPlatformEntitlementRepository;
  let publisher: InMemoryPlatformEntitlementEventPublisherStub;
  let auditLog: InMemoryPlatformEntitlementAuditLogStub;
  let useCase: AddCapability;

  beforeEach(() => {
    repo = new InMemoryPlatformEntitlementRepository();
    publisher = new InMemoryPlatformEntitlementEventPublisherStub();
    auditLog = new InMemoryPlatformEntitlementAuditLogStub();
    useCase = new AddCapability(repo, publisher, auditLog);
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it('adds capability to ACTIVE entitlement and publishes EntitlementCapabilityAdded', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.API_ACCESS]);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.MULTI_PROFILE,
      reason: 'Upgrade requested',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.saveCount).toBe(1);
    expect(auditLog.written).toHaveLength(1);
    expect(publisher.publishedCapabilityAdded).toHaveLength(1);

    const published = publisher.publishedCapabilityAdded[0];
    expect(published.payload.capability).toBe(EntitlementType.MULTI_PROFILE);
    expect(published.payload.reason).toBe('Upgrade requested');
  });

  it('audit log has addedCapabilities with the new capability', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.API_ACCESS]);
    repo.items.push(entitlement);

    await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.MULTI_PROFILE,
      reason: 'Audit check',
      ...MOCK_ACTOR,
    });

    expect(auditLog.written[0]).toMatchObject({
      actorId: MOCK_ACTOR.actorId,
      actorRole: MOCK_ACTOR.actorRole,
      tenantId: professionalProfileId,
      addedCapabilities: [EntitlementType.MULTI_PROFILE],
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns Right(void) without saving when capability already present (idempotent)', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [EntitlementType.API_ACCESS]);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Re-add attempt',
      ...MOCK_ACTOR,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.saveCount).toBe(0);
    expect(auditLog.written).toHaveLength(0);
    expect(publisher.publishedCapabilityAdded).toHaveLength(0);
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
    expect(repo.saveCount).toBe(0);
  });

  // ── Invalid transitions ───────────────────────────────────────────────────

  it('returns Left when entitlement is SUSPENDED', async () => {
    const professionalProfileId = generateId();
    const entitlement = makeEntitlement(professionalProfileId, [], EntitlementStatus.SUSPENDED);
    repo.items.push(entitlement);

    const result = await useCase.execute({
      professionalProfileId,
      capability: EntitlementType.API_ACCESS,
      reason: 'Add while suspended',
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
});
