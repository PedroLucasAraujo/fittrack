// ── Domain ────────────────────────────────────────────────────────────────────
export * from './domain/index.js';

// ── Application DTOs ──────────────────────────────────────────────────────────
export type {
  CreateAchievementDefinitionInputDTO,
  CreateAchievementDefinitionOutputDTO,
} from './application/dtos/create-achievement-definition-dto.js';
export type {
  ActivateAchievementDefinitionInputDTO,
  ActivateAchievementDefinitionOutputDTO,
} from './application/dtos/activate-achievement-definition-dto.js';
export type { UserAchievementProgressDTO } from './application/dtos/user-achievement-progress-dto.js';
export type {
  ListUserAchievementsInputDTO,
  ListUserAchievementsOutputDTO,
  AchievementFilter,
} from './application/dtos/list-user-achievements-dto.js';
export type {
  GetAchievementProgressInputDTO,
  GetAchievementProgressOutputDTO,
} from './application/dtos/get-achievement-progress-dto.js';

// ── Application Ports ─────────────────────────────────────────────────────────
export type { IAchievementEventPublisher } from './application/ports/i-achievement-event-publisher.js';

// ── Application Services ──────────────────────────────────────────────────────
export { AchievementEvaluator } from './application/services/achievement-evaluator.js';
export type { EvaluationResult } from './application/services/achievement-evaluator.js';
export type { IUserStatsQueryService } from './application/services/i-user-stats-query-service.js';

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { CreateAchievementDefinition } from './application/use-cases/create-achievement-definition.js';
export { ActivateAchievementDefinition } from './application/use-cases/activate-achievement-definition.js';
export { ListUserAchievements } from './application/use-cases/list-user-achievements.js';
export { GetAchievementProgress } from './application/use-cases/get-achievement-progress.js';
export { ListAvailableAchievements } from './application/use-cases/list-available-achievements.js';
export type {
  ListAvailableAchievementsInputDTO,
  ListAvailableAchievementsOutputDTO,
} from './application/use-cases/list-available-achievements.js';

// ── Event Handlers ────────────────────────────────────────────────────────────
export { OnWorkoutExecutionCompleted } from './application/event-handlers/on-workout-execution-completed.js';
export type { ExecutionRecordedPayload } from './application/event-handlers/on-workout-execution-completed.js';
export { OnStreakMetricComputed } from './application/event-handlers/on-streak-metric-computed.js';
export type { StreakMetricComputedPayload } from './application/event-handlers/on-streak-metric-computed.js';
export { OnUserCreated } from './application/event-handlers/on-user-created.js';
export type { UserCreatedPayload } from './application/event-handlers/on-user-created.js';
