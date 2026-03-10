export interface GetActiveChallengesInputDTO {
  userId?: string;
  visibility?: string;
  type?: string;
}

export interface ChallengeSummaryDTO {
  challengeId: string;
  name: string;
  description: string;
  type: string;
  visibility: string;
  category: string;
  goalMetricType: string;
  goalTargetValue: number;
  startDateUtc: Date;
  endDateUtc: Date;
  rewardPolicy: string;
  maxParticipants: number | null;
}

export interface GetActiveChallengesOutputDTO {
  challenges: ChallengeSummaryDTO[];
}
