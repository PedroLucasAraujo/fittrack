import type { CatalogItemStatus } from '../../domain/enums/catalog-item-status.js';

export interface ArchiveCatalogItemOutputDTO {
  catalogItemId: string;
  status: CatalogItemStatus;
  archivedAtUtc: string;
}
