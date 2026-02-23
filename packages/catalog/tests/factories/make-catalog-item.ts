import { generateId, UTCDateTime } from '@fittrack/core';
import { CatalogItem } from '../../domain/aggregates/catalog-item.js';
import type { CatalogItemProps } from '../../domain/aggregates/catalog-item.js';
import { CatalogItemType } from '../../domain/enums/catalog-item-type.js';
import { CatalogItemStatus } from '../../domain/enums/catalog-item-status.js';
import { CatalogItemName } from '../../domain/value-objects/catalog-item-name.js';

/**
 * Creates a CatalogItem via `reconstitute` for use in tests that need to
 * set arbitrary status (e.g., DEPRECATED, ARCHIVED).
 *
 * Defaults: ACTIVE EXERCISE owned by a generated professional.
 */
export function makeCatalogItem(
  overrides: Partial<CatalogItemProps> & { id?: string } = {},
): CatalogItem {
  const { id, ...propOverrides } = overrides;

  const nameResult = CatalogItemName.create('Bench Press');
  if (nameResult.isLeft()) throw new Error('Invalid test name');

  const props: CatalogItemProps = {
    professionalProfileId: generateId(),
    type: CatalogItemType.EXERCISE,
    status: CatalogItemStatus.ACTIVE,
    name: nameResult.value,
    contentVersion: 1,
    description: null,
    category: 'STRENGTH',
    muscleGroups: ['CHEST', 'TRICEPS'],
    instructions: 'Lie flat on bench, lower bar to chest, press upward.',
    mediaUrl: null,
    createdAtUtc: UTCDateTime.now(),
    deprecatedAtUtc: null,
    archivedAtUtc: null,
    ...propOverrides,
  };

  return CatalogItem.reconstitute(id ?? generateId(), props, 0);
}

/**
 * Creates a global (platform-curated) CatalogItem via `reconstitute`.
 * `professionalProfileId` is null.
 */
export function makeGlobalCatalogItem(
  overrides: Partial<CatalogItemProps> & { id?: string } = {},
): CatalogItem {
  return makeCatalogItem({ professionalProfileId: null, ...overrides });
}

/**
 * Creates a new CatalogItem via the domain factory (always ACTIVE).
 * Use when testing the creation path.
 */
export function makeNewCatalogItem(
  overrides: Partial<{
    professionalProfileId: string | null;
    name: string;
    type: CatalogItemType;
    description: string | null;
    category: string | null;
    muscleGroups: string[];
    instructions: string | null;
    mediaUrl: string | null;
  }> = {},
): CatalogItem {
  const nameResult = CatalogItemName.create(overrides.name ?? 'Squat');
  if (nameResult.isLeft()) throw new Error(`Invalid test name: ${overrides.name}`);

  const result = CatalogItem.create({
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    type: overrides.type ?? CatalogItemType.EXERCISE,
    name: nameResult.value,
    description: overrides.description ?? null,
    category: overrides.category ?? null,
    muscleGroups: overrides.muscleGroups ?? [],
    instructions: overrides.instructions ?? null,
    mediaUrl: overrides.mediaUrl ?? null,
    createdAtUtc: UTCDateTime.now(),
  });

  if (result.isLeft()) throw new Error('Failed to create test CatalogItem');
  return result.value;
}
