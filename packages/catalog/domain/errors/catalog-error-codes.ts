/**
 * Error code registry for the Catalog bounded context.
 *
 * Namespaced with `CATALOG.` prefix to avoid collisions with
 * core ErrorCodes and codes from other bounded contexts (ADR-0008 pattern).
 */
export const CatalogErrorCodes = {
  /** CatalogItem name or content field fails validation. */
  INVALID_CATALOG_ITEM: 'CATALOG.INVALID_CATALOG_ITEM',
  /** A state transition that is not permitted by the CatalogItem lifecycle. */
  INVALID_CATALOG_ITEM_TRANSITION: 'CATALOG.INVALID_CATALOG_ITEM_TRANSITION',
  /** CatalogItem was not found, or belongs to a different tenant (ADR-0025 — 404 semantics). */
  CATALOG_ITEM_NOT_FOUND: 'CATALOG.CATALOG_ITEM_NOT_FOUND',
  /** Content mutation attempted on an ARCHIVED CatalogItem (ADR-0011 §3). */
  CATALOG_ITEM_ARCHIVED: 'CATALOG.CATALOG_ITEM_ARCHIVED',
} as const;

export type CatalogErrorCode = (typeof CatalogErrorCodes)[keyof typeof CatalogErrorCodes];
