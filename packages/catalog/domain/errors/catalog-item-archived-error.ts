import { DomainError } from '@fittrack/core';
import { CatalogErrorCodes } from './catalog-error-codes.js';

/**
 * Returned when a content mutation is attempted on an ARCHIVED CatalogItem.
 *
 * ARCHIVED items are permanently retired and read-only (ADR-0011 §3).
 * State transitions on ARCHIVED items raise `InvalidCatalogItemTransitionError` instead.
 */
export class CatalogItemArchivedError extends DomainError {
  constructor(catalogItemId: string) {
    super(
      `CatalogItem "${catalogItemId}" is ARCHIVED and cannot be modified.`,
      CatalogErrorCodes.CATALOG_ITEM_ARCHIVED,
      { catalogItemId },
    );
  }
}
