import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateDeliverable } from '../../../application/use-cases/create-deliverable.js';
import { InMemoryDeliverableRepository } from '../../repositories/in-memory-deliverable-repository.js';
import { DeliverableStatus } from '../../../domain/enums/deliverable-status.js';
import { DeliverableType } from '../../../domain/enums/deliverable-type.js';
import { DeliverableErrorCodes } from '../../../domain/errors/deliverable-error-codes.js';

describe('CreateDeliverable', () => {
  let repository: InMemoryDeliverableRepository;
  let sut: CreateDeliverable;

  beforeEach(() => {
    repository = new InMemoryDeliverableRepository();
    sut = new CreateDeliverable(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('creates a DRAFT TRAINING_PRESCRIPTION deliverable and returns output DTO', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Full Body Strength',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.title).toBe('Full Body Strength');
      expect(output.type).toBe(DeliverableType.TRAINING_PRESCRIPTION);
      expect(output.status).toBe(DeliverableStatus.DRAFT);
      expect(output.contentVersion).toBe(1);
      expect(output.exerciseCount).toBe(0);
      expect(output.logicalDay).toBe('2026-02-22');
      expect(output.timezoneUsed).toBe('America/Sao_Paulo');
      expect(output.createdAtUtc).toBeDefined();
    }
  });

  it('creates a TRAINING_PRESCRIPTION deliverable with initial exercises', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Upper Body',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
      exercises: [
        { name: 'Bench Press', sets: 3, reps: 10 },
        { name: 'Shoulder Press', sets: 3, reps: 12 },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.exerciseCount).toBe(2);
      // contentVersion: 1 (initial) + 2 adds = 3
      expect(result.value.contentVersion).toBe(3);
    }
  });

  it('creates a DIET_PLAN deliverable (no exercises)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Low Carb Plan',
      type: DeliverableType.DIET_PLAN,
      createdAtUtc: '2026-02-22T12:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.type).toBe(DeliverableType.DIET_PLAN);
      expect(result.value.exerciseCount).toBe(0);
    }
  });

  it('creates a PHYSIOLOGICAL_ASSESSMENT deliverable', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Body Composition Assessment',
      type: DeliverableType.PHYSIOLOGICAL_ASSESSMENT,
      createdAtUtc: '2026-02-22T08:00:00.000Z',
      timezoneUsed: 'UTC',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.type).toBe(DeliverableType.PHYSIOLOGICAL_ASSESSMENT);
    }
  });

  it('ignores exercises for DIET_PLAN type', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Keto Diet',
      type: DeliverableType.DIET_PLAN,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
      exercises: [{ name: 'Bench Press', sets: 3, reps: 10 }],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // Exercises are ignored for non-TRAINING_PRESCRIPTION types
      expect(result.value.exerciseCount).toBe(0);
    }
  });

  it('stores description when provided', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Hypertrophy Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      description: 'Focus on volume and progressive overload',
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.description).toBe('Focus on volume and progressive overload');
    }
  });

  it('persists the deliverable in the repository', async () => {
    await sut.execute({
      professionalProfileId: generateId(),
      title: 'Strength Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(repository.items).toHaveLength(1);
  });

  it('stores exercise with catalog traceability fields (ADR-0011 §4)', async () => {
    const catalogItemId = generateId();

    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Program with Catalog',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
      exercises: [
        {
          name: 'Squat',
          sets: 4,
          reps: 8,
          catalogItemId,
          catalogVersion: 2,
        },
      ],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const saved = repository.items[0];
      expect(saved?.exercises[0]?.catalogItemId).toBe(catalogItemId);
      expect(saved?.exercises[0]?.catalogVersion).toBe(2);
      expect(saved?.exercises[0]?.snapshotCreatedAtUtc).not.toBeNull();
    }
  });

  it('creates a TRAINING_PRESCRIPTION with time-based exercise (no sets/reps — covers ?? null branches)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Cardio Circuit',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
      exercises: [{ name: 'Plank Hold', durationSeconds: 60 }],
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.exerciseCount).toBe(1);
    }
  });

  // ── Validation errors ──────────────────────────────────────────────────────

  it('returns error for invalid professionalProfileId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      title: 'Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for empty title', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: '',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE);
    }
  });

  it('returns error for title exceeding 120 characters', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'A'.repeat(121),
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(DeliverableErrorCodes.INVALID_DELIVERABLE);
    }
  });

  it('returns error for invalid createdAtUtc (not UTC)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000+03:00',
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid timezoneUsed', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      title: 'Program',
      type: DeliverableType.TRAINING_PRESCRIPTION,
      createdAtUtc: '2026-02-22T10:00:00.000Z',
      timezoneUsed: 'Not/ATimezone',
    });

    expect(result.isLeft()).toBe(true);
  });
});
