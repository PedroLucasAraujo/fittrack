import type { CatalogItemStatus } from '../../domain/enums/catalog-item-status.js';

export interface UpdateCatalogItemContentOutputDTO {
  catalogItemId: string;
  status: CatalogItemStatus;
  name: string;
  contentVersion: number;
  description: string | null;
  category: string | null;
  muscleGroups: string[];
  instructions: string | null;
  mediaUrl: string | null;
}
