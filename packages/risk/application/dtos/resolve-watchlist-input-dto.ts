export interface ResolveWatchlistInputDTO {
  professionalProfileId: string;
  /** Why the watchlist flag is being cleared (admin review outcome). Non-empty, ≤500 chars. */
  reason: string;
}
