export interface GetEngagementHistoryInputDTO {
  userId: string;
  /** Number of weeks to retrieve. Defaults to 8. Max 12. */
  weeks?: number;
}

export interface EngagementHistoryItemDTO {
  weekStartDate: string;
  weekEndDate: string;
  overallScore: number;
  engagementLevel: string;
  workoutScore: number;
  habitScore: number;
  goalProgressScore: number;
  streakScore: number;
  workoutsCompleted: number;
  nutritionLogsCreated: number;
  bookingsAttended: number;
  currentStreak: number;
}

export interface GetEngagementHistoryOutputDTO {
  userId: string;
  history: EngagementHistoryItemDTO[];
}
