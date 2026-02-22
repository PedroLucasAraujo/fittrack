export interface ActivateDeliverableInputDTO {
  deliverableId: string;
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
}
