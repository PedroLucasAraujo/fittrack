import type { CatalogItemType } from '../../domain/enums/catalog-item-type.js';
import type { CatalogItemStatus } from '../../domain/enums/catalog-item-status.js';

export interface CreateCatalogItemOutputDTO {
  catalogItemId: string;
  /** null for global items, UUIDv4 for custom items. */
  professionalProfileId: string | null;
  type: CatalogItemType;
  status: CatalogItemStatus;
  name: string;
  contentVersion: number;
  description: string | null;
  category: string | null;
  muscleGroups: string[];
  instructions: string | null;
  mediaUrl: string | null;
  createdAtUtc: string;
}
