export interface CreateChallengeInputDTO {
  createdBy: string;
  type: string; // 'INDIVIDUAL' | 'COMMUNITY' | 'HEAD_TO_HEAD'
  visibility: string; // 'PUBLIC' | 'PROFESSIONAL' | 'PRIVATE'
  name: string;
  description: string;
  category: string; // 'WORKOUT' | 'NUTRITION' | 'STREAK' | 'VOLUME'
  goalMetricType: string; // 'WORKOUT_COUNT' | 'TOTAL_VOLUME' | 'STREAK_DAYS' | 'NUTRITION_LOG_COUNT'
  goalTargetValue: number;
  startDateUtc: Date;
  endDateUtc: Date;
  maxParticipants?: number | null;
  rewardPolicy: string; // 'WINNER' | 'TOP_3' | 'TOP_10' | 'ALL_COMPLETERS'
}

export interface CreateChallengeOutputDTO {
  challengeId: string;
}
