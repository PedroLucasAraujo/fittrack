export interface GetUserChallengeProgressInputDTO {
  challengeId: string;
  userId: string;
}

export interface GetUserChallengeProgressOutputDTO {
  participationId: string;
  challengeId: string;
  userId: string;
  currentProgress: number;
  progressPercentage: number;
  goalTargetValue: number;
  hasCompleted: boolean;
  completedAtUtc: Date | null;
  joinedAtUtc: Date;
}
