import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProgressPercentage } from '../../domain/value-objects/progress-percentage.js';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';
import type {
  ListUserAchievementsInputDTO,
  ListUserAchievementsOutputDTO,
} from '../dtos/list-user-achievements-dto.js';
import type { UserAchievementProgressDTO } from '../dtos/user-achievement-progress-dto.js';

/**
 * Lists all active achievements with the user's progress for each.
 *
 * Achievements the user has no progress record for are returned as "locked"
 * (currentValue = 0, isUnlocked = false, progressId = null).
 */
export class ListUserAchievements {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly progressRepo: IUserAchievementProgressRepository,
  ) {}

  async execute(
    dto: ListUserAchievementsInputDTO,
  ): Promise<DomainResult<ListUserAchievementsOutputDTO>> {
    const definitionsResult = await this.definitionRepo.findActive();
    if (definitionsResult.isLeft()) return left(definitionsResult.value);

    const progressesResult = await this.progressRepo.findByUserId(dto.userId);
    if (progressesResult.isLeft()) return left(progressesResult.value);

    const progressMap = new Map(progressesResult.value.map((p) => [p.achievementDefinitionId, p]));

    const filter = dto.filter ?? 'all';
    let achievements: UserAchievementProgressDTO[] = [];
    let unlockedCount = 0;

    for (const definition of definitionsResult.value) {
      const progress = progressMap.get(definition.id) ?? null;
      const currentValue = progress?.currentValue.value ?? 0;
      const targetValue = definition.criteria.targetValue.value;
      const isUnlocked = progress?.isUnlocked() ?? false;

      if (isUnlocked) unlockedCount++;

      const item: UserAchievementProgressDTO = {
        progressId: progress?.id ?? null,
        definitionId: definition.id,
        code: definition.code.value,
        name: definition.name.value,
        description: definition.description.value,
        category: definition.category.value,
        tier: definition.tier.value,
        tierColor: definition.tier.getColor(),
        iconUrl: definition.iconUrl.value,
        currentValue,
        targetValue,
        progressPercentage: ProgressPercentage.compute(currentValue, targetValue).value,
        isUnlocked,
        unlockedAtUtc: progress?.unlockedAtUtc ?? null,
        metricType: definition.criteria.metric.value,
        operator: definition.criteria.operator.value,
        timeWindow: definition.criteria.timeWindow,
      };

      achievements.push(item);
    }

    // Apply filter
    if (filter === 'unlocked') {
      achievements = achievements.filter((a) => a.isUnlocked);
    } else if (filter === 'locked') {
      achievements = achievements.filter((a) => !a.isUnlocked && a.currentValue === 0);
    } else if (filter === 'in_progress') {
      achievements = achievements.filter(
        (a) => !a.isUnlocked && a.progressId !== null && a.currentValue > 0,
      );
    }

    return right({
      achievements,
      total: achievements.length,
      unlockedCount,
    });
  }
}
