import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { UpdateCatalogItemContent } from '../../../application/use-cases/update-catalog-item-content.js';
import { InMemoryCatalogItemRepository } from '../../repositories/in-memory-catalog-item-repository.js';
import { CatalogItemStatus } from '../../../domain/enums/catalog-item-status.js';
import { CatalogErrorCodes } from '../../../domain/errors/catalog-error-codes.js';
import { makeCatalogItem, makeGlobalCatalogItem } from '../../factories/make-catalog-item.js';

describe('UpdateCatalogItemContent', () => {
  let repository: InMemoryCatalogItemRepository;
  let sut: UpdateCatalogItemContent;

  beforeEach(() => {
    repository = new InMemoryCatalogItemRepository();
    sut = new UpdateCatalogItemContent(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('updates name and increments contentVersion', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId, contentVersion: 1 });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId,
      catalogItemId: item.id,
      name: 'Romanian Deadlift',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Romanian Deadlift');
      expect(result.value.contentVersion).toBe(2);
    }
  });

  it('updates all content fields at once', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId,
      catalogItemId: item.id,
      name: 'Hip Thrust',
      description: 'Glute isolation',
      category: 'STRENGTH',
      muscleGroups: ['GLUTES', 'HAMSTRINGS'],
      instructions: 'Set up on bench, drive hips up.',
      mediaUrl: 'https://cdn.example.com/hip-thrust.mp4',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe('Hip Thrust');
      expect(result.value.description).toBe('Glute isolation');
      expect(result.value.category).toBe('STRENGTH');
      expect(result.value.muscleGroups).toEqual(['GLUTES', 'HAMSTRINGS']);
      expect(result.value.instructions).toBe('Set up on bench, drive hips up.');
      expect(result.value.mediaUrl).toBe('https://cdn.example.com/hip-thrust.mp4');
    }
  });

  it('clears nullable fields when null is passed', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({
      professionalProfileId,
      category: 'STRENGTH',
      instructions: 'Old instructions',
    });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId,
      catalogItemId: item.id,
      category: null,
      instructions: null,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.category).toBeNull();
      expect(result.value.instructions).toBeNull();
    }
  });

  it('allows updates on a DEPRECATED item (ADR-0011 §7)', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId, status: CatalogItemStatus.DEPRECATED });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId,
      catalogItemId: item.id,
      name: 'Updated Deprecated Exercise',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(CatalogItemStatus.DEPRECATED);
      expect(result.value.name).toBe('Updated Deprecated Exercise');
    }
  });

  it('persists the updated content to the repository', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId });
    repository.items.push(item);

    await sut.execute({
      professionalProfileId,
      catalogItemId: item.id,
      name: 'Cable Row',
    });

    expect(repository.items[0]?.name.value).toBe('Cable Row');
    expect(repository.items[0]?.contentVersion).toBe(2);
  });

  // ── Authorization: cross-tenant / global items ─────────────────────────────

  it('returns NOT_FOUND for a different professional (ADR-0025)', async () => {
    const item = makeCatalogItem({ professionalProfileId: generateId() });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: item.id,
      name: 'New Name',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_NOT_FOUND);
    }
  });

  it('returns NOT_FOUND for global items (professionals cannot update global items)', async () => {
    const item = makeGlobalCatalogItem();
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: item.id,
      name: 'Attempt to override global',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_NOT_FOUND);
    }
  });

  it('returns NOT_FOUND when item does not exist', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: generateId(),
      name: 'Ghost Item',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_NOT_FOUND);
    }
  });

  // ── ARCHIVED guard ─────────────────────────────────────────────────────────

  it('returns CATALOG_ITEM_ARCHIVED when item is ARCHIVED', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId, status: CatalogItemStatus.ARCHIVED });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId,
      catalogItemId: item.id,
      name: 'Try to update archived',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_ARCHIVED);
    }
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      catalogItemId: generateId(),
      name: 'Pull-Up',
    });
    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid catalogItemId', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: 'not-a-uuid',
      name: 'Pull-Up',
    });
    expect(result.isLeft()).toBe(true);
  });

  it('returns error when new name is empty', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: generateId(),
      name: '',
    });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM);
    }
  });

  it('returns error when new name exceeds 120 characters', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: generateId(),
      name: 'A'.repeat(121),
    });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM);
    }
  });
});
