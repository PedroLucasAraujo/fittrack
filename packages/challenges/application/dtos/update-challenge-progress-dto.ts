export interface UpdateChallengeProgressInputDTO {
  challengeId: string;
  userId: string;
  metricType: string;
  newProgressValue: number;
}

export interface UpdateChallengeProgressOutputDTO {
  currentProgress: number;
  progressPercentage: number;
  completedGoal: boolean;
}
