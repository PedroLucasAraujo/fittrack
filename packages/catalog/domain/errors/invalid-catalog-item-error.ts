import { DomainError } from '@fittrack/core';
import { CatalogErrorCodes } from './catalog-error-codes.js';

/**
 * Thrown when a CatalogItem field fails a validation rule.
 *
 * Examples: name is empty, name exceeds 120 characters.
 */
export class InvalidCatalogItemError extends DomainError {
  constructor(message: string) {
    super(message, CatalogErrorCodes.INVALID_CATALOG_ITEM);
  }
}
