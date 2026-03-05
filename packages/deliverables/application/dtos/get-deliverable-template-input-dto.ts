export interface GetDeliverableTemplateInputDTO {
  templateId: string;
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
}
