export interface GetUserWeeklyVolumeHistoryInputDTO {
  userId: string;
  professionalProfileId: string;
  /** Number of past weeks to return (default: 4). */
  lastNWeeks?: number;
}

export interface WeeklyVolumeHistoryEntry {
  metricId: string;
  weekStartDate: string;
  totalVolume: number;
  workoutCount: number;
}

export interface GetUserWeeklyVolumeHistoryOutputDTO {
  /** Ordered most-recent-first. */
  history: WeeklyVolumeHistoryEntry[];
}
