import type { CatalogItemStatus } from '../../domain/enums/catalog-item-status.js';

export interface DeprecateCatalogItemOutputDTO {
  catalogItemId: string;
  status: CatalogItemStatus;
  deprecatedAtUtc: string;
}
