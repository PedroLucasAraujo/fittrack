export interface UseStreakFreezeTokenInputDTO {
  /** UUIDv4 of the user spending the freeze token. */
  userId: string;
}

export interface UseStreakFreezeTokenOutputDTO {
  /** Streak value preserved by the freeze. */
  currentStreak: number;
  /** Remaining freeze tokens after spending one. */
  freezeTokensRemaining: number;
}
