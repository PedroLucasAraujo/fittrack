import { DomainError } from '@fittrack/core';
import { CatalogErrorCodes } from './catalog-error-codes.js';
import type { CatalogItemStatus } from '../enums/catalog-item-status.js';

/**
 * Returned when a state transition is not permitted by the CatalogItem
 * lifecycle state machine (ADR-0011 §7).
 *
 * Valid transitions:
 * - ACTIVE → DEPRECATED
 * - ACTIVE → ARCHIVED
 * - DEPRECATED → ARCHIVED
 */
export class InvalidCatalogItemTransitionError extends DomainError {
  constructor(from: CatalogItemStatus, to: CatalogItemStatus) {
    super(
      `CatalogItem cannot transition from ${from} to ${to}.`,
      CatalogErrorCodes.INVALID_CATALOG_ITEM_TRANSITION,
      { from, to },
    );
  }
}
