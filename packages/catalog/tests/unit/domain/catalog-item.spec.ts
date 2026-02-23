import { describe, it, expect } from 'vitest';
import { generateId, UTCDateTime } from '@fittrack/core';
import { CatalogItem } from '../../../domain/aggregates/catalog-item.js';
import { CatalogItemType } from '../../../domain/enums/catalog-item-type.js';
import { CatalogItemStatus } from '../../../domain/enums/catalog-item-status.js';
import { CatalogItemName } from '../../../domain/value-objects/catalog-item-name.js';
import { CatalogErrorCodes } from '../../../domain/errors/catalog-error-codes.js';
import { makeCatalogItem, makeGlobalCatalogItem } from '../../factories/make-catalog-item.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeName(value = 'Bench Press'): CatalogItemName {
  const result = CatalogItemName.create(value);
  if (result.isLeft()) throw new Error('Invalid test name');
  return result.value;
}

function makeItem(overrides: Partial<Parameters<typeof CatalogItem.create>[0]> = {}): CatalogItem {
  const result = CatalogItem.create({
    professionalProfileId: generateId(),
    type: CatalogItemType.EXERCISE,
    name: makeName(),
    createdAtUtc: UTCDateTime.now(),
    ...overrides,
  });
  if (result.isLeft()) throw new Error('Failed to create CatalogItem');
  return result.value;
}

// ── CatalogItemName value object ─────────────────────────────────────────────

describe('CatalogItemName', () => {
  it('creates a valid name and trims whitespace', () => {
    const result = CatalogItemName.create('  Bench Press  ');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.value).toBe('Bench Press');
  });

  it('rejects an empty name', () => {
    const result = CatalogItemName.create('');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM);
  });

  it('rejects a whitespace-only name', () => {
    const result = CatalogItemName.create('   ');
    expect(result.isLeft()).toBe(true);
  });

  it('accepts a name of exactly 120 characters', () => {
    const result = CatalogItemName.create('A'.repeat(120));
    expect(result.isRight()).toBe(true);
  });

  it('rejects a name exceeding 120 characters', () => {
    const result = CatalogItemName.create('A'.repeat(121));
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM);
  });
});

// ── CatalogItem creation ─────────────────────────────────────────────────────

describe('CatalogItem.create', () => {
  it('creates a custom item in ACTIVE status with contentVersion 1', () => {
    const professionalProfileId = generateId();
    const item = makeItem({ professionalProfileId });

    expect(item.status).toBe(CatalogItemStatus.ACTIVE);
    expect(item.contentVersion).toBe(1);
    expect(item.professionalProfileId).toBe(professionalProfileId);
    expect(item.type).toBe(CatalogItemType.EXERCISE);
    expect(item.isGlobal()).toBe(false);
    expect(item.isOwnedBy(professionalProfileId)).toBe(true);
  });

  it('creates a global item with null professionalProfileId', () => {
    const item = makeItem({ professionalProfileId: null });

    expect(item.professionalProfileId).toBeNull();
    expect(item.isGlobal()).toBe(true);
    expect(item.isOwnedBy(generateId())).toBe(false);
  });

  it('defaults muscleGroups to an empty array when not provided', () => {
    const item = makeItem();
    expect(item.muscleGroups).toEqual([]);
  });

  it('stores all exercise-specific content fields', () => {
    const item = makeItem({
      category: 'STRENGTH',
      muscleGroups: ['CHEST', 'TRICEPS'],
      instructions: 'Press the bar up.',
      mediaUrl: 'https://cdn.example.com/bench.mp4',
      description: 'Classic chest exercise',
    });

    expect(item.category).toBe('STRENGTH');
    expect(item.muscleGroups).toEqual(['CHEST', 'TRICEPS']);
    expect(item.instructions).toBe('Press the bar up.');
    expect(item.mediaUrl).toBe('https://cdn.example.com/bench.mp4');
    expect(item.description).toBe('Classic chest exercise');
  });

  it('uses a provided id when given', () => {
    const id = generateId();
    const item = makeItem({ id });
    expect(item.id).toBe(id);
  });

  it('generates an id when not provided', () => {
    const item = makeItem();
    expect(item.id).toBeDefined();
    expect(item.id.length).toBeGreaterThan(0);
  });
});

// ── CatalogItem reconstitution ────────────────────────────────────────────────

describe('CatalogItem.reconstitute', () => {
  it('reconstitutes with provided version', () => {
    const item = makeCatalogItem({ contentVersion: 5 });
    expect(item.contentVersion).toBe(5);
    expect(item.version).toBe(0);
  });
});

// ── Lifecycle: deprecate ──────────────────────────────────────────────────────

describe('CatalogItem.deprecate', () => {
  it('transitions ACTIVE → DEPRECATED and sets deprecatedAtUtc', () => {
    const item = makeItem();

    const result = item.deprecate();

    expect(result.isRight()).toBe(true);
    expect(item.status).toBe(CatalogItemStatus.DEPRECATED);
    expect(item.deprecatedAtUtc).not.toBeNull();
    expect(item.isDeprecated()).toBe(true);
  });

  it('returns error when already DEPRECATED', () => {
    const item = makeCatalogItem({ status: CatalogItemStatus.DEPRECATED });

    const result = item.deprecate();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM_TRANSITION);
    }
  });

  it('returns error when ARCHIVED', () => {
    const item = makeCatalogItem({ status: CatalogItemStatus.ARCHIVED });

    const result = item.deprecate();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM_TRANSITION);
    }
  });
});

// ── Lifecycle: archive ────────────────────────────────────────────────────────

describe('CatalogItem.archive', () => {
  it('transitions ACTIVE → ARCHIVED and sets archivedAtUtc', () => {
    const item = makeItem();

    const result = item.archive();

    expect(result.isRight()).toBe(true);
    expect(item.status).toBe(CatalogItemStatus.ARCHIVED);
    expect(item.archivedAtUtc).not.toBeNull();
    expect(item.isArchived()).toBe(true);
  });

  it('transitions DEPRECATED → ARCHIVED', () => {
    const item = makeCatalogItem({ status: CatalogItemStatus.DEPRECATED });

    const result = item.archive();

    expect(result.isRight()).toBe(true);
    expect(item.status).toBe(CatalogItemStatus.ARCHIVED);
  });

  it('returns error when already ARCHIVED', () => {
    const item = makeCatalogItem({ status: CatalogItemStatus.ARCHIVED });

    const result = item.archive();

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.INVALID_CATALOG_ITEM_TRANSITION);
    }
  });
});

// ── Content mutation: updateContent ──────────────────────────────────────────

describe('CatalogItem.updateContent', () => {
  it('updates name and increments contentVersion', () => {
    const item = makeItem();
    const newName = makeName('Pull-Up');

    const result = item.updateContent({ name: newName });

    expect(result.isRight()).toBe(true);
    expect(item.name.value).toBe('Pull-Up');
    expect(item.contentVersion).toBe(2);
  });

  it('updates all content fields in a single call', () => {
    const item = makeItem();
    const newName = makeName('Deadlift');

    item.updateContent({
      name: newName,
      description: 'Hip hinge movement',
      category: 'STRENGTH',
      muscleGroups: ['HAMSTRINGS', 'GLUTES', 'BACK'],
      instructions: 'Hip-hinge, grip bar, drive heels into floor.',
      mediaUrl: 'https://cdn.example.com/deadlift.mp4',
    });

    expect(item.name.value).toBe('Deadlift');
    expect(item.description).toBe('Hip hinge movement');
    expect(item.category).toBe('STRENGTH');
    expect(item.muscleGroups).toEqual(['HAMSTRINGS', 'GLUTES', 'BACK']);
    expect(item.instructions).toBe('Hip-hinge, grip bar, drive heels into floor.');
    expect(item.mediaUrl).toBe('https://cdn.example.com/deadlift.mp4');
    expect(item.contentVersion).toBe(2);
  });

  it('clears nullable fields when null is passed explicitly', () => {
    const item = makeCatalogItem({ description: 'Old description', category: 'OLD' });

    item.updateContent({ description: null, category: null });

    expect(item.description).toBeNull();
    expect(item.category).toBeNull();
    expect(item.contentVersion).toBe(2);
  });

  it('allows updates on a DEPRECATED item', () => {
    const item = makeCatalogItem({ status: CatalogItemStatus.DEPRECATED });
    const newName = makeName('Updated Exercise');

    const result = item.updateContent({ name: newName });

    expect(result.isRight()).toBe(true);
    expect(item.name.value).toBe('Updated Exercise');
    expect(item.contentVersion).toBe(2);
  });

  it('returns CatalogItemArchivedError when ARCHIVED', () => {
    const item = makeCatalogItem({ status: CatalogItemStatus.ARCHIVED });
    const newName = makeName('Updated');

    const result = item.updateContent({ name: newName });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(CatalogErrorCodes.CATALOG_ITEM_ARCHIVED);
    }
  });

  it('increments contentVersion on each separate call', () => {
    const item = makeItem();

    item.updateContent({ description: 'First update' });
    item.updateContent({ description: 'Second update' });

    expect(item.contentVersion).toBe(3);
  });
});

// ── Query methods ─────────────────────────────────────────────────────────────

describe('CatalogItem query methods', () => {
  it('isActive returns true only for ACTIVE status', () => {
    expect(makeCatalogItem({ status: CatalogItemStatus.ACTIVE }).isActive()).toBe(true);
    expect(makeCatalogItem({ status: CatalogItemStatus.DEPRECATED }).isActive()).toBe(false);
    expect(makeCatalogItem({ status: CatalogItemStatus.ARCHIVED }).isActive()).toBe(false);
  });

  it('isDeprecated returns true only for DEPRECATED status', () => {
    expect(makeCatalogItem({ status: CatalogItemStatus.DEPRECATED }).isDeprecated()).toBe(true);
    expect(makeCatalogItem({ status: CatalogItemStatus.ACTIVE }).isDeprecated()).toBe(false);
  });

  it('isArchived returns true only for ARCHIVED status', () => {
    expect(makeCatalogItem({ status: CatalogItemStatus.ARCHIVED }).isArchived()).toBe(true);
    expect(makeCatalogItem({ status: CatalogItemStatus.ACTIVE }).isArchived()).toBe(false);
  });

  it('isAvailableForPrescription returns true for ACTIVE and DEPRECATED', () => {
    expect(makeCatalogItem({ status: CatalogItemStatus.ACTIVE }).isAvailableForPrescription()).toBe(
      true,
    );
    expect(
      makeCatalogItem({ status: CatalogItemStatus.DEPRECATED }).isAvailableForPrescription(),
    ).toBe(true);
    expect(
      makeCatalogItem({ status: CatalogItemStatus.ARCHIVED }).isAvailableForPrescription(),
    ).toBe(false);
  });

  it('isGlobal returns true when professionalProfileId is null', () => {
    expect(makeGlobalCatalogItem().isGlobal()).toBe(true);
    expect(makeCatalogItem({ professionalProfileId: generateId() }).isGlobal()).toBe(false);
  });

  it('isOwnedBy returns true only when professionalProfileId matches', () => {
    const pid = generateId();
    const item = makeCatalogItem({ professionalProfileId: pid });
    expect(item.isOwnedBy(pid)).toBe(true);
    expect(item.isOwnedBy(generateId())).toBe(false);
  });
});

// ── Getters: defensive copies ─────────────────────────────────────────────────

describe('CatalogItem.muscleGroups getter', () => {
  it('returns a copy so external mutations do not affect the aggregate', () => {
    const item = makeItem({ muscleGroups: ['CHEST'] });
    const groups = item.muscleGroups;
    groups.push('TRICEPS');

    expect(item.muscleGroups).toEqual(['CHEST']);
  });
});
