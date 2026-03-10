export interface GetStreakStatusInputDTO {
  /** UUIDv4 of the user to query. */
  userId: string;
}

export interface GetStreakStatusOutputDTO {
  currentStreak: number;
  longestStreak: number;
  freezeTokenCount: number;
  /** Days until the next freeze token is earned (1–7). */
  daysUntilNextFreezeToken: number;
  /** True when currentStreak > 0. */
  isActive: boolean;
  /** True when lastActivityDay < yesterday UTC. */
  isAtRisk: boolean;
  /** YYYY-MM-DD UTC of the last recorded activity, or null. */
  lastActivityDay: string | null;
  /** YYYY-MM-DD UTC of when the current streak started, or null. */
  streakStartDay: string | null;
}
