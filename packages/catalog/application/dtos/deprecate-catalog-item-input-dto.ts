export interface DeprecateCatalogItemInputDTO {
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  catalogItemId: string;
}
