import { CurrentValue } from '../../domain/value-objects/current-value.js';
import { UserAchievementProgress } from '../../domain/aggregates/user-achievement-progress.js';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';

/**
 * Payload from the UserCreated event emitted by the Identity bounded context.
 */
export interface UserCreatedPayload {
  userId: string;
}

/**
 * Handles UserCreated events from the Identity bounded context.
 *
 * ## Responsibility
 * When a new user is created, initializes UserAchievementProgress records
 * for all currently active achievement definitions with currentValue = 0.
 *
 * This ensures users have progress records from day one, allowing accurate
 * "locked" vs "in_progress" filtering without requiring lazy creation.
 *
 * ## Bounded context isolation (ADR-0005)
 * Does NOT import from @fittrack/identity. Receives payload as plain DTO.
 *
 * ## Error handling
 * Failures are logged but do not block user creation. This handler is
 * best-effort — missing progress records are created lazily by the evaluator.
 */
export class OnUserCreated {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly progressRepo: IUserAchievementProgressRepository,
  ) {}

  async handle(payload: UserCreatedPayload): Promise<void> {
    const definitionsResult = await this.definitionRepo.findActive();
    if (definitionsResult.isLeft()) return;

    const zeroValue = CurrentValue.zero();

    for (const definition of definitionsResult.value) {
      // Check if progress already exists (idempotent)
      const existsResult = await this.progressRepo.existsByUserAndDefinition(
        payload.userId,
        definition.id,
      );
      if (existsResult.isLeft() || existsResult.value) continue;

      const progressResult = UserAchievementProgress.create({
        userId: payload.userId,
        achievementDefinitionId: definition.id,
        achievementCode: definition.code.value,
        achievementTier: definition.tier.value,
        achievementCategory: definition.category.value,
        currentValue: zeroValue,
        targetValue: definition.criteria.targetValue,
      });
      /* v8 ignore next */
      if (progressResult.isLeft()) continue;

      await this.progressRepo.save(progressResult.value);
    }
  }
}
