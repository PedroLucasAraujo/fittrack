export interface EscalateToWatchlistInputDTO {
  professionalProfileId: string;
  /** Why the professional is being placed on watchlist. Non-empty, ≤500 chars. */
  reason: string;
  /** Optional reference ID for supporting evidence (report ID, metric snapshot ID, etc.). */
  evidenceRef?: string;
}
