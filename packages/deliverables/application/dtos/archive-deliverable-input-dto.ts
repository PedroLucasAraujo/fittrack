export interface ArchiveDeliverableInputDTO {
  deliverableId: string;
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
}
