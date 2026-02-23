export interface UpdateCatalogItemContentInputDTO {
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  catalogItemId: string;

  /**
   * Fields to update. At least one must be provided.
   * Omitted fields remain unchanged.
   * `null` explicitly clears a nullable field.
   */
  name?: string;
  description?: string | null;
  category?: string | null;
  muscleGroups?: string[];
  instructions?: string | null;
  mediaUrl?: string | null;
}
