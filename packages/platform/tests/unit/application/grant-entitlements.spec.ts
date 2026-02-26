import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { PlatformEntitlement } from '../../../domain/aggregates/platform-entitlement.js';
import { EntitlementStatus } from '../../../domain/enums/entitlement-status.js';
import { EntitlementType } from '../../../domain/enums/entitlement-type.js';
import { PlatformErrorCodes } from '../../../domain/errors/platform-error-codes.js';
import { GrantEntitlements } from '../../../application/use-cases/grant-entitlements.js';
import { InMemoryPlatformEntitlementRepository } from '../../repositories/in-memory-platform-entitlement-repository.js';
import { InMemoryPlatformEntitlementEventPublisherStub } from '../../stubs/in-memory-platform-entitlement-event-publisher-stub.js';
import { InMemoryPlatformEntitlementAuditLogStub } from '../../stubs/in-memory-platform-entitlement-audit-log-stub.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOCK_ACTOR = { actorId: 'admin-001', actorRole: 'ADMIN' } as const;

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
  let repo: InMemoryPlatformEntitlementRepository;
  let publisher: InMemoryPlatformEntitlementEventPublisherStub;
  let auditLog: InMemoryPlatformEntitlementAuditLogStub;
  let useCase: GrantEntitlements;

  beforeEach(() => {
    repo = new InMemoryPlatformEntitlementRepository();
    publisher = new InMemoryPlatformEntitlementEventPublisherStub();
    auditLog = new InMemoryPlatformEntitlementAuditLogStub();
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
    expect(repo.saveCount).toBe(1);
    expect(auditLog.written).toHaveLength(1);
    expect(publisher.publishedEntitlementGranted).toHaveLength(1);
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

    const published = publisher.publishedEntitlementGranted[0];
    expect(published).toBeDefined();
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

    expect(auditLog.written[0]).toMatchObject({
      actorId: MOCK_ACTOR.actorId,
      actorRole: MOCK_ACTOR.actorRole,
      tenantId: professionalProfileId,
      addedCapabilities: [EntitlementType.API_ACCESS],
    });
  });

  // ── Success — re-grant existing entitlement ───────────────────────────────

  it('re-grants existing ACTIVE entitlement, replacing capabilities', async () => {
    const professionalProfileId = generateId();
    const existing = makeExistingEntitlement(professionalProfileId);
    repo.items.push(existing);

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
    expect(repo.saveCount).toBe(1);
  });

  it('re-grants SUSPENDED entitlement, resetting to ACTIVE', async () => {
    const professionalProfileId = generateId();
    const existing = makeExistingEntitlement(professionalProfileId, EntitlementStatus.SUSPENDED);
    repo.items.push(existing);

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

    expect(auditLog.written[0]).toMatchObject({ reason: 'Trimmed reason' });
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
    expect(repo.saveCount).toBe(0);
    expect(auditLog.written).toHaveLength(0);
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
    expect(repo.saveCount).toBe(0);
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
    expect(repo.saveCount).toBe(0);
  });
});
