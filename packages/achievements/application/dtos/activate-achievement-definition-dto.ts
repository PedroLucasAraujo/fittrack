export interface ActivateAchievementDefinitionInputDTO {
  definitionId: string;
}

export interface ActivateAchievementDefinitionOutputDTO {
  definitionId: string;
  code: string;
  isActive: boolean;
}
