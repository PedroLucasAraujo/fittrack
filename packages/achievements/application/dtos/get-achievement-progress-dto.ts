import type { UserAchievementProgressDTO } from './user-achievement-progress-dto.js';

export interface GetAchievementProgressInputDTO {
  userId: string;
  definitionId: string;
}

export type GetAchievementProgressOutputDTO = UserAchievementProgressDTO;
