import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ArchiveCatalogItem } from '../../../application/use-cases/archive-catalog-item.js';
import { InMemoryCatalogItemRepository } from '../../repositories/in-memory-catalog-item-repository.js';
import { CatalogItemStatus } from '../../../domain/enums/catalog-item-status.js';
import { CatalogErrorCodes } from '../../../domain/errors/catalog-error-codes.js';
import { makeCatalogItem, makeGlobalCatalogItem } from '../../factories/make-catalog-item.js';

describe('ArchiveCatalogItem', () => {
  let repository: InMemoryCatalogItemRepository;
  let sut: ArchiveCatalogItem;

  beforeEach(() => {
    repository = new InMemoryCatalogItemRepository();
    sut = new ArchiveCatalogItem(repository);
  });

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('archives an ACTIVE custom item', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId, status: CatalogItemStatus.ACTIVE });
    repository.items.push(item);

    const result = await sut.execute({ professionalProfileId, catalogItemId: item.id });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(CatalogItemStatus.ARCHIVED);
      expect(result.value.archivedAtUtc).toBeDefined();
    }
  });

  it('archives a DEPRECATED item', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId, status: CatalogItemStatus.DEPRECATED });
    repository.items.push(item);

    const result = await sut.execute({ professionalProfileId, catalogItemId: item.id });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(CatalogItemStatus.ARCHIVED);
    }
  });

  it('persists the archived state to the repository', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId });
    repository.items.push(item);

    await sut.execute({ professionalProfileId, catalogItemId: item.id });

    expect(repository.items[0]?.status).toBe(CatalogItemStatus.ARCHIVED);
  });

  // ── Authorization: cross-tenant / global items ─────────────────────────────

  it('returns NOT_FOUND for a different professional (ADR-0025)', async () => {
    const item = makeCatalogItem({ professionalProfileId: generateId() });
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: item.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_NOT_FOUND);
    }
  });

  it('returns NOT_FOUND for global items (professionals cannot archive global items)', async () => {
    const item = makeGlobalCatalogItem();
    repository.items.push(item);

    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: item.id,
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
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_NOT_FOUND);
    }
  });

  // ── State machine errors ───────────────────────────────────────────────────

  it('returns transition error when item is already ARCHIVED', async () => {
    const professionalProfileId = generateId();
    const item = makeCatalogItem({ professionalProfileId, status: CatalogItemStatus.ARCHIVED });
    repository.items.push(item);

    const result = await sut.execute({ professionalProfileId, catalogItemId: item.id });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM_TRANSITION);
    }
  });

  // ── Input validation ───────────────────────────────────────────────────────

  it('returns error for invalid professionalProfileId', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      catalogItemId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('returns error for invalid catalogItemId', async () => {
    const result = await sut.execute({
      professionalProfileId: generateId(),
      catalogItemId: 'not-a-uuid',
    });
    expect(result.isLeft()).toBe(true);
  });
});
