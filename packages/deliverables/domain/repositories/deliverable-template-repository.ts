import type { IRepository } from '@fittrack/core';
import type { DeliverableTemplate } from '../aggregates/deliverable-template.js';
import type { DeliverableType } from '../enums/deliverable-type.js';

/**
 * Repository interface for the DeliverableTemplate aggregate root.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * Every query method that returns templates scoped to a professional MUST
 * accept `professionalProfileId` as a non-optional parameter.
 * Cross-tenant queries are never permitted.
 *
 * ## Uniqueness constraint
 *
 * Template names must be unique per professional. The `existsByProfessionalAndName`
 * method enables the Application layer to enforce this before saving.
 */
export interface IDeliverableTemplateRepository extends IRepository<DeliverableTemplate> {
  /**
   * Finds a template by id, scoped to the given professional (ADR-0025).
   * Returns null when not found or when id belongs to a different tenant.
   */
  findByIdAndProfessionalProfileId(
    id: string,
    professionalProfileId: string,
  ): Promise<DeliverableTemplate | null>;

  /**
   * Returns all templates for the given professional.
   */
  findByProfessional(professionalProfileId: string): Promise<DeliverableTemplate[]>;

  /**
   * Returns only ACTIVE templates for the given professional.
   */
  findActiveByProfessional(professionalProfileId: string): Promise<DeliverableTemplate[]>;

  /**
   * Returns templates for the given professional filtered by type.
   */
  findByType(professionalProfileId: string, type: DeliverableType): Promise<DeliverableTemplate[]>;

  /**
   * Returns true if a template with the given name already exists for the professional.
   * Used to enforce the name-uniqueness constraint before saving.
   */
  existsByProfessionalAndName(professionalProfileId: string, name: string): Promise<boolean>;
}
