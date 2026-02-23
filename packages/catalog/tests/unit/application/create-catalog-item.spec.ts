import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CreateCatalogItem } from '../../../application/use-cases/create-catalog-item.js';
import { InMemoryCatalogItemRepository } from '../../repositories/in-memory-catalog-item-repository.js';
import { CatalogItemType } from '../../../domain/enums/catalog-item-type.js';
import { CatalogItemStatus } from '../../../domain/enums/catalog-item-status.js';
import { CatalogErrorCodes } from '../../../domain/errors/catalog-error-codes.js';

describe('CreateCatalogItem', () => {
  let repository: InMemoryCatalogItemRepository;
  let sut: CreateCatalogItem;

  beforeEach(() => {
    repository = new InMemoryCatalogItemRepository();
    sut = new CreateCatalogItem(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('creates a custom EXERCISE item in ACTIVE status', async () => {
    const professionalProfileId = generateId();

    const result = await sut.execute({
      professionalProfileId,
      type: CatalogItemType.EXERCISE,
      name: 'Bench Press',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.status).toBe(CatalogItemStatus.ACTIVE);
      expect(output.type).toBe(CatalogItemType.EXERCISE);
      expect(output.name).toBe('Bench Press');
      expect(output.contentVersion).toBe(1);
      expect(output.professionalProfileId).toBe(professionalProfileId);
      expect(output.createdAtUtc).toBeDefined();
    }
  });

  it('creates a global item when professionalProfileId is null', async () => {
    const result = await sut.execute({
      professionalProfileId: null,
      type: CatalogItemType.EXERCISE,
      name: 'Deadlift',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.professionalProfileId).toBeNull();
    }
  });

  it('stores all exercise-specific content fields', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      type: CatalogItemType.EXERCISE,
      name: 'Squat',
      category: 'STRENGTH',
      muscleGroups: ['QUADRICEPS', 'GLUTES'],
      instructions: 'Stand with feet hip-width apart.',
      mediaUrl: 'https://cdn.example.com/squat.mp4',
      description: 'Fundamental lower body movement',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.category).toBe('STRENGTH');
      expect(output.muscleGroups).toEqual(['QUADRICEPS', 'GLUTES']);
      expect(output.instructions).toBe('Stand with feet hip-width apart.');
      expect(output.mediaUrl).toBe('https://cdn.example.com/squat.mp4');
      expect(output.description).toBe('Fundamental lower body movement');
    }
  });

  it('defaults muscleGroups to empty array when not provided', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      type: CatalogItemType.EXERCISE,
      name: 'Plank',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.muscleGroups).toEqual([]);
    }
  });

  it('persists the item in the repository', async () => {
    await sut.execute({
      professionalProfileId: generateId(),
      type: CatalogItemType.EXERCISE,
      name: 'Pull-Up',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(repository.items).toHaveLength(1);
  });

  // ── Validation errors ──────────────────────────────────────────────────────

  it('returns error for invalid professionalProfileId (not a UUID)', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      type: CatalogItemType.EXERCISE,
      name: 'Push-Up',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error for empty name', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      type: CatalogItemType.EXERCISE,
      name: '',
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM);
    }
  });

  it('returns error for name exceeding 120 characters', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      type: CatalogItemType.EXERCISE,
      name: 'A'.repeat(121),
      createdAtUtc: '2026-02-23T10:00:00.000Z',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM);
    }
  });

  it('returns error for invalid createdAtUtc (non-UTC string)', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      type: CatalogItemType.EXERCISE,
      name: 'Push-Up',
      createdAtUtc: '2026-02-23T10:00:00.000+03:00',
    });

    expect(result.isLeft()).toBe(true);
  });
});
