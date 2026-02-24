export interface BanProfessionalInputDTO {
  professionalProfileId: string;
  /** Why the professional is being permanently banned. Non-empty, ≤500 chars. */
  reason: string;
  /** Optional reference ID for the evidence that triggered the ban. */
  evidenceRef?: string;
  /** userId of the admin performing this action (required for AuditLog — ADR-0027 §1). */
  actorId: string;
  /** Role of the admin performing this action (required for AuditLog — ADR-0027 §1). */
  actorRole: string;
}
