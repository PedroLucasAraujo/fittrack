import { left, right } from '@fittrack/core';
import type { DomainResult, DomainError } from '@fittrack/core';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';
import type { MetricType } from '../../domain/value-objects/achievement-metric-type.js';
import { CurrentValue } from '../../domain/value-objects/current-value.js';
import { UserAchievementProgress } from '../../domain/aggregates/user-achievement-progress.js';

export interface EvaluationResult {
  progress: UserAchievementProgress;
  wasUnlocked: boolean;
  wasProgressUpdated: boolean;
  oldValue: number;
  newValue: number;
}

/**
 * Application service that orchestrates achievement evaluation for a user.
 *
 * ## Responsibilities
 * 1. Find all active definitions matching the given metric.
 * 2. For each definition, find or create the user's progress record.
 * 3. Update currentValue if higher than existing.
 * 4. Unlock achievements that have reached their target.
 * 5. Persist updated progress records.
 * 6. Return list of evaluation results (including which ones were newly unlocked).
 *
 * Lives in application/services/ because it coordinates multiple repositories.
 * It does NOT dispatch events — the Application layer (Use Case or Event Handler)
 * is responsible for event publication (ADR-0009 §4).
 */
export class AchievementEvaluator {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly progressRepo: IUserAchievementProgressRepository,
  ) {}

  async evaluateForUser(
    userId: string,
    metric: MetricType,
    newValue: number,
  ): Promise<DomainResult<EvaluationResult[]>> {
    // 1. Find active definitions matching this metric
    const definitionsResult = await this.definitionRepo.findActiveByMetric(metric);
    if (definitionsResult.isLeft()) return left(definitionsResult.value);

    const definitions = definitionsResult.value;
    const results: EvaluationResult[] = [];

    for (const definition of definitions) {
      // 2. Find existing progress or create new one
      const existingResult = await this.progressRepo.findByUserAndDefinition(userId, definition.id);
      if (existingResult.isLeft()) return left(existingResult.value as DomainError);

      let progress = existingResult.value;

      if (progress === null) {
        // No progress record yet — create one starting at 0 then update below
        const newValueVO = CurrentValue.create(0);
        /* v8 ignore next */
        if (newValueVO.isLeft()) return left(newValueVO.value);

        const createResult = UserAchievementProgress.create({
          userId,
          achievementDefinitionId: definition.id,
          achievementCode: definition.code.value,
          achievementTier: definition.tier.value,
          achievementCategory: definition.category.value,
          currentValue: newValueVO.value,
          targetValue: definition.criteria.targetValue,
        });
        /* v8 ignore next */
        if (createResult.isLeft()) return left(createResult.value);
        progress = createResult.value;
      }

      // 3. Skip if already unlocked (idempotent)
      if (progress.isUnlocked()) {
        results.push({
          progress,
          wasUnlocked: false,
          wasProgressUpdated: false,
          oldValue: progress.currentValue.value,
          newValue: progress.currentValue.value,
        });
        continue;
      }

      // 4. Update progress if newValue is higher
      const newValueVO = CurrentValue.create(newValue);
      if (newValueVO.isLeft()) return left(newValueVO.value);

      const oldValue = progress.currentValue.value;
      let wasProgressUpdated = false;
      if (newValue > progress.currentValue.value) {
        const updateResult = progress.updateProgress(newValueVO.value);
        /* v8 ignore next */
        if (updateResult.isLeft()) return left(updateResult.value);
        wasProgressUpdated = true;
      }

      // 5. Unlock if target reached
      let wasUnlocked = false;
      if (progress.hasReachedTarget()) {
        const unlockResult = progress.unlock();
        /* v8 ignore next */
        if (unlockResult.isLeft()) return left(unlockResult.value);
        wasUnlocked = true;
      }

      // 6. Persist
      const saveResult = await this.progressRepo.save(progress);
      if (saveResult.isLeft()) return left(saveResult.value as DomainError);

      results.push({ progress, wasUnlocked, wasProgressUpdated, oldValue, newValue });
    }

    return right(results);
  }
}
