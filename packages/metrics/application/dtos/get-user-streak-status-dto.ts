export interface GetUserStreakStatusInputDTO {
  userId: string;
  professionalProfileId: string;
}

export interface GetUserStreakStatusOutputDTO {
  /** Returns 0 if no streak metric exists yet. */
  currentStreak: number;
  longestStreak: number;
  /** ACTIVE | BROKEN | NEVER_STARTED */
  streakStatus: string;
  /** Last logicalDay with confirmed activity (YYYY-MM-DD), or null if never. */
  lastActivityDate: string | null;
}
