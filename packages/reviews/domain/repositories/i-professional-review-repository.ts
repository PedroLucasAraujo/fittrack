import type { ProfessionalReview } from '../aggregates/professional-review.js';

/**
 * Repository interface for the ProfessionalReview aggregate.
 * All queries include professionalProfileId for tenant isolation (ADR-0025).
 * Interface lives in the domain layer; implementation lives in infrastructure.
 */
export interface IProfessionalReviewRepository {
  save(review: ProfessionalReview): Promise<void>;

  /**
   * Fetches a review by ID without tenant scope.
   * Only use in admin/moderation contexts where cross-tenant access is intentional.
   * For professional-scoped access, prefer findByIdAndProfessionalProfileId().
   */
  findById(id: string): Promise<ProfessionalReview | null>;

  /**
   * Fetches a review by ID scoped to the owning professional (ADR-0025).
   * Returns null when the review does not exist OR belongs to a different
   * professional — the caller always receives a 404, never a 403.
   */
  findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<ProfessionalReview | null>;

  findByProfessional(professionalProfileId: string): Promise<ProfessionalReview[]>;

  /**
   * Returns all reviews submitted by this client across all professionals.
   *
   * ADR-0025 exception: query is scoped by clientId, not professionalProfileId.
   * The client is the acting principal viewing their own review history
   * across multiple professionals — cross-professional access is intentional here.
   */
  findByClient(clientId: string): Promise<ProfessionalReview[]>;

  /**
   * Returns the single existing review for this client-professional pair,
   * or null if none exists yet.
   */
  findByProfessionalAndClient(
    professionalProfileId: string,
    clientId: string,
  ): Promise<ProfessionalReview | null>;

  /**
   * Returns only visible (not hidden) reviews for the given professional.
   * Used for public listing.
   */
  findVisibleByProfessional(professionalProfileId: string): Promise<ProfessionalReview[]>;

  /**
   * Returns all flagged reviews across all professionals.
   *
   * ADR-0025 exception: platform moderator cross-tenant query.
   * Admins operate across all tenants for moderation purposes.
   */
  findFlagged(): Promise<ProfessionalReview[]>;

  /**
   * Returns true if a review already exists for this client-professional pair.
   */
  existsByProfessionalAndClient(professionalProfileId: string, clientId: string): Promise<boolean>;
}
