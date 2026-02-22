import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ArchiveDeliverable } from '../../../application/use-cases/archive-deliverable.js';
import { InMemoryDeliverableRepository } from '../../repositories/in-memory-deliverable-repository.js';
import { DeliverableStatus } from '../../../domain/enums/deliverable-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { DeliverableErrorCodes } from '../../../domain/errors/deliverable-error-codes.js';
import { makeDeliverable } from '../../factories/make-deliverable.js';

describe('ArchiveDeliverable', () => {
  let repository: InMemoryDeliverableRepository;
  let sut: ArchiveDeliverable;

  beforeEach(() => {
    repository = new InMemoryDeliverableRepository();
    sut = new ArchiveDeliverable(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('archives a DRAFT deliverable', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.PROGRAM,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(DeliverableStatus.ARCHIVED);
      expect(result.value.archivedAtUtc).toBeDefined();
    }
  });

  it('archives an ACTIVE deliverable', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.ACTIVE,
      type: DeliverableType.DIET_PLAN,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(DeliverableStatus.ARCHIVED);
    }
  });

  it('persists ARCHIVED status in repository', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.ACTIVE,
      type: DeliverableType.PROGRAM,
    });
    await repository.save(deliverable);

    await sut.execute({ deliverableId: deliverable.id, professionalProfileId: profileId });

    expect(repository.items[0]?.status).toBe(DeliverableStatus.ARCHIVED);
  });

  it('returns deliverableId and type in output', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.ASSESSMENT_TEMPLATE,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.deliverableId).toBe(deliverable.id);
      expect(result.value.type).toBe(DeliverableType.ASSESSMENT_TEMPLATE);
    }
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────

  it('returns NotFound for wrong professionalProfileId (cross-tenant, ADR-0025)', async () => {
    const ownerProfileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: ownerProfileId,
      status: DeliverableStatus.ACTIVE,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_FOUND);
    }
  });

  it('returns NotFound for non-existent deliverable', async () => {
    const result = await sut.execute({
      deliverableId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.DELIVERABLE_NOT_FOUND);
    }
  });

  // ── Terminal state ─────────────────────────────────────────────────────────

  it('returns error when already ARCHIVED (terminal — no transitions out)', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.ARCHIVED,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE_TRANSITION);
    }
  });
});
