export interface EscalateToWatchlistInputDTO {
  professionalProfileId: string;
  /** Why the professional is being placed on watchlist. Non-empty, ≤500 chars. */
  reason: string;
  /** Optional reference ID for supporting evidence (report ID, metric snapshot ID, etc.). */
  evidenceRef?: string;
  /** userId of the admin performing this action (required for AuditLog — ADR-0027 §1). */
  actorId: string;
  /** Role of the admin performing this action (required for AuditLog — ADR-0027 §1). */
  actorRole: string;
}
