import type { UserAchievementProgressDTO } from './user-achievement-progress-dto.js';

export type AchievementFilter = 'all' | 'unlocked' | 'in_progress' | 'locked';

export interface ListUserAchievementsInputDTO {
  userId: string;
  filter?: AchievementFilter;
}

export interface ListUserAchievementsOutputDTO {
  achievements: UserAchievementProgressDTO[];
  total: number;
  unlockedCount: number;
}
