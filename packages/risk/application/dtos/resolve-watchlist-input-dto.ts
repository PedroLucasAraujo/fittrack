export interface ResolveWatchlistInputDTO {
  professionalProfileId: string;
  /** Why the watchlist flag is being cleared (admin review outcome). Non-empty, ≤500 chars. */
  reason: string;
  /** userId of the admin performing this action (required for AuditLog — ADR-0027 §1). */
  actorId: string;
  /** Role of the admin performing this action (required for AuditLog — ADR-0027 §1). */
  actorRole: string;
}
