export interface InstantiateDeliverableTemplateInputDTO {
  templateId: string;
  /** From JWT — never from request body (ADR-0025). */
  professionalProfileId: string;
  /** ISO 8601 UTC string for the Deliverable creation timestamp. */
  createdAtUtc: string;
  /** IANA timezone of the professional at creation time (ADR-0010). */
  timezoneUsed: string;
  /** Optional parameter overrides for the template instantiation. */
  parameterValues?: Record<string, string | number | boolean>;
}
