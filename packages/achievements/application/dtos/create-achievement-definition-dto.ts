export interface CreateAchievementDefinitionInputDTO {
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  metricType: string;
  operator: string;
  targetValue: number;
  iconUrl: string;
  isRepeatable?: boolean;
  timeWindow?: string;
}

export interface CreateAchievementDefinitionOutputDTO {
  definitionId: string;
  code: string;
  name: string;
  category: string;
  tier: string;
  isActive: boolean;
  createdAtUtc: string;
}
