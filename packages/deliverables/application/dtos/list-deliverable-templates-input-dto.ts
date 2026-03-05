import type { DeliverableType } from '../../domain/enums/deliverable-type.js';

export interface ListDeliverableTemplatesInputDTO {
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  /** If true, returns only ACTIVE templates. */
  activeOnly?: boolean;
  /** If provided, filters templates by type. */
  type?: DeliverableType;
}
