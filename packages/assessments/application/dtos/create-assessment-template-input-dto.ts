export interface CreateAssessmentTemplateInputDTO {
  /** Tenant — from authenticated JWT (ADR-0025). */
  professionalProfileId: string;
  /** Template title. 1–120 chars. */
  title: string;
  /** Optional description of the template's purpose. */
  description?: string | null;
  /** ISO 8601 UTC timestamp of creation (ADR-0010). */
  createdAtUtc: string;
  /** Client's IANA timezone for logicalDay computation (ADR-0010). */
  timezoneUsed: string;
}
