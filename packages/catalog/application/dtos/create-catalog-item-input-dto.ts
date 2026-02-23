import type { CatalogItemType } from '../../domain/enums/catalog-item-type.js';

export interface CreateCatalogItemInputDTO {
  /**
   * Owning professional's id. From JWT — never from request body (ADR-0025).
   *
   * `null` creates a platform-global CatalogItem (platform admin operation).
   * A valid UUIDv4 creates a custom CatalogItem visible only to this professional.
   */
  professionalProfileId: string | null;

  /** Resource type discriminator. Only EXERCISE is active in MVP. */
  type: CatalogItemType;

  /** Name of the catalog resource. 1–120 characters. */
  name: string;

  /** Optional description of the resource. */
  description?: string | null;

  // ── EXERCISE-specific fields (ADR-0011 §2) ────────────────────────────────
  // Required when type = EXERCISE, optional for future types.

  /**
   * Exercise category. Examples: 'STRENGTH', 'CARDIO', 'MOBILITY'.
   */
  category?: string | null;

  /**
   * Muscle groups targeted. Examples: ['CHEST', 'TRICEPS'].
   */
  muscleGroups?: string[];

  /**
   * Step-by-step execution instructions.
   */
  instructions?: string | null;

  /**
   * URL of a demonstration video or image.
   */
  mediaUrl?: string | null;

  /**
   * ISO 8601 UTC string representing the creation instant.
   * Must end with 'Z' (ADR-0010).
   */
  createdAtUtc: string;
}
