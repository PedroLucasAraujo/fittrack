export interface CalculateUserEngagementInputDTO {
  userId: string;
  professionalProfileId: string;
}

export interface CalculateUserEngagementOutputDTO {
  engagementId: string;
  userId: string;
  overallScore: number;
  engagementLevel: string;
  trend: string;
  trendPercentage: number | null;
  isAtRisk: boolean;
  calculatedAtUtc: string;
}
