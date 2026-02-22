import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ActivateDeliverable } from '../../../application/use-cases/activate-deliverable.js';
import { InMemoryDeliverableRepository } from '../../repositories/in-memory-deliverable-repository.js';
import { DeliverableStatus } from '../../../domain/enums/deliverable-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { DeliverableErrorCodes } from '../../../domain/errors/deliverable-error-codes.js';
import { makeDeliverable, makeExerciseAssignment } from '../../factories/make-deliverable.js';

describe('ActivateDeliverable', () => {
  let repository: InMemoryDeliverableRepository;
  let sut: ActivateDeliverable;

  beforeEach(() => {
    repository = new InMemoryDeliverableRepository();
    sut = new ActivateDeliverable(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('activates a DRAFT PROGRAM with exercises', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.PROGRAM,
      exercises: [makeExerciseAssignment()],
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(DeliverableStatus.ACTIVE);
      expect(result.value.activatedAtUtc).toBeDefined();
    }
  });

  it('activates a DRAFT DIET_PLAN (no exercises required)', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.DIET_PLAN,
      exercises: [],
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(DeliverableStatus.ACTIVE);
    }
  });

  it('activates a DRAFT ASSESSMENT_TEMPLATE', async () => {
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
  });

  it('persists the ACTIVE status', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.DIET_PLAN,
    });
    await repository.save(deliverable);

    await sut.execute({ deliverableId: deliverable.id, professionalProfileId: profileId });

    const saved = repository.items[0];
    expect(saved?.status).toBe(DeliverableStatus.ACTIVE);
  });

  it('returns deliverableId and contentVersion in output', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.DIET_PLAN,
      contentVersion: 5,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.deliverableId).toBe(deliverable.id);
      expect(result.value.contentVersion).toBe(5);
    }
  });

  // ── Tenant isolation (ADR-0025) ────────────────────────────────────────────

  it('returns NotFound for wrong professionalProfileId (cross-tenant, ADR-0025)', async () => {
    const ownerProfileId = generateId();
    const attackerProfileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: ownerProfileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.DIET_PLAN,
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: attackerProfileId,
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

  // ── State machine errors ────────────────────────────────────────────────────

  it('returns error when PROGRAM has no exercises', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.DRAFT,
      type: DeliverableType.PROGRAM,
      exercises: [],
    });
    await repository.save(deliverable);

    const result = await sut.execute({
      deliverableId: deliverable.id,
      professionalProfileId: profileId,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.EMPTY_EXERCISE_LIST);
    }
  });

  it('returns error when already ACTIVE', async () => {
    const profileId = generateId();
    const deliverable = makeDeliverable({
      professionalProfileId: profileId,
      status: DeliverableStatus.ACTIVE,
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

  it('returns error when ARCHIVED (terminal state)', async () => {
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
