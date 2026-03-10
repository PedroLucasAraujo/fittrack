export interface GetChallengeLeaderboardInputDTO {
  challengeId: string;
  topN?: number;
}

export interface LeaderboardEntryDTO {
  participationId: string;
  userId: string;
  currentProgress: number;
  progressPercentage: number;
  rank: number;
  completedAtUtc: Date | null;
}

export interface GetChallengeLeaderboardOutputDTO {
  challengeId: string;
  entries: LeaderboardEntryDTO[];
  lastUpdatedAtUtc: Date | null;
}
