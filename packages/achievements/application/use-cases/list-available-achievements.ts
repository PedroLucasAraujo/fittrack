import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProgressPercentage } from '../../domain/value-objects/progress-percentage.js';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';
import type { UserAchievementProgressDTO } from '../dtos/user-achievement-progress-dto.js';

export interface ListAvailableAchievementsInputDTO {
  userId: string;
}

export interface ListAvailableAchievementsOutputDTO {
  achievements: UserAchievementProgressDTO[];
  total: number;
}

/**
 * Returns achievements the user has not yet unlocked, ordered by progress percentage (desc).
 * Useful for surfacing "what to do next" to motivate the user.
 */
export class ListAvailableAchievements {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly progressRepo: IUserAchievementProgressRepository,
  ) {}

  async execute(
    dto: ListAvailableAchievementsInputDTO,
  ): Promise<DomainResult<ListAvailableAchievementsOutputDTO>> {
    const definitionsResult = await this.definitionRepo.findActive();
    if (definitionsResult.isLeft()) return left(definitionsResult.value);

    const unlockedResult = await this.progressRepo.findUnlockedByUserId(dto.userId);
    if (unlockedResult.isLeft()) return left(unlockedResult.value);

    const allProgressResult = await this.progressRepo.findByUserId(dto.userId);
    if (allProgressResult.isLeft()) return left(allProgressResult.value);

    const unlockedIds = new Set(unlockedResult.value.map((p) => p.achievementDefinitionId));
    const progressMap = new Map(allProgressResult.value.map((p) => [p.achievementDefinitionId, p]));

    const achievements: UserAchievementProgressDTO[] = definitionsResult.value
      .filter((d) => !unlockedIds.has(d.id))
      .map((definition) => {
        const progress = progressMap.get(definition.id) ?? null;
        const currentValue = progress?.currentValue.value ?? 0;
        const targetValue = definition.criteria.targetValue.value;

        return {
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
          isUnlocked: false,
          unlockedAtUtc: null,
          metricType: definition.criteria.metric.value,
          operator: definition.criteria.operator.value,
          timeWindow: definition.criteria.timeWindow,
        };
      })
      .sort((a, b) => b.progressPercentage - a.progressPercentage);

    return right({ achievements, total: achievements.length });
  }
}
