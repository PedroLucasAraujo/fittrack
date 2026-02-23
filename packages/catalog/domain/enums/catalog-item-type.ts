/**
 * Discriminator enum for CatalogItem resource types (ADR-0001 §1, ADR-0011 §2).
 *
 * Only EXERCISE is implemented in MVP. FOOD and EVALUATION_TEMPLATE are reserved
 * for post-MVP introduction per ADR-0001 §1 and ADR-0044.
 *
 * Governance: governed by ADR-0012 (Enum and Shared Type Governance).
 * New values require a feature flag and ADR review per ADR-0044.
 */
export enum CatalogItemType {
  EXERCISE = 'EXERCISE',
  // FOOD = 'FOOD',                           // post-MVP (ADR-0001 §1)
  // EVALUATION_TEMPLATE = 'EVALUATION_TEMPLATE', // post-MVP (ADR-0001 §1)
}
