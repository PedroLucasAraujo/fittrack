import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { CatalogErrorCodes } from './catalog-error-codes.js';

/**
 * Returned when a CatalogItem cannot be located in the repository.
 *
 * Also returned when the item exists but belongs to a different tenant —
 * consistent with the ADR-0025 rule that cross-tenant access returns 404,
 * never 403.
 */
export class CatalogItemNotFoundError extends DomainError {
  constructor(catalogItemId: string) {
    super(
      `CatalogItem with id "${catalogItemId}" was not found.`,
      CatalogErrorCodes.CATALOG_ITEM_NOT_FOUND as ErrorCode,
      { catalogItemId },
    );
  }
}
