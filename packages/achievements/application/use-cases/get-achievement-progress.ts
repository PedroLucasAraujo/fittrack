import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProgressPercentage } from '../../domain/value-objects/progress-percentage.js';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';
import { AchievementDefinitionNotFoundError } from '../../domain/errors/achievement-definition-not-found-error.js';
import type {
  GetAchievementProgressInputDTO,
  GetAchievementProgressOutputDTO,
} from '../dtos/get-achievement-progress-dto.js';

/**
 * Returns the current progress for a specific user + achievement definition pair.
 * If no progress record exists, returns a locked view with zero progress.
 */
export class GetAchievementProgress {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly progressRepo: IUserAchievementProgressRepository,
  ) {}

  async execute(
    dto: GetAchievementProgressInputDTO,
  ): Promise<DomainResult<GetAchievementProgressOutputDTO>> {
    const definitionResult = await this.definitionRepo.findById(dto.definitionId);
    if (definitionResult.isLeft()) return left(definitionResult.value);
    if (definitionResult.value === null) {
      return left(new AchievementDefinitionNotFoundError(dto.definitionId));
    }

    const definition = definitionResult.value;

    const progressResult = await this.progressRepo.findByUserAndDefinition(
      dto.userId,
      dto.definitionId,
    );
    if (progressResult.isLeft()) return left(progressResult.value);

    const progress = progressResult.value;
    const currentValue = progress?.currentValue.value ?? 0;
    const targetValue = definition.criteria.targetValue.value;

    return right({
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
      isUnlocked: progress?.isUnlocked() ?? false,
      unlockedAtUtc: progress?.unlockedAtUtc ?? null,
      metricType: definition.criteria.metric.value,
      operator: definition.criteria.operator.value,
      timeWindow: definition.criteria.timeWindow,
    });
  }
}
