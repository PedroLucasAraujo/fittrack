// ── Errors ────────────────────────────────────────────────────────────────────
export { AchievementErrorCodes } from './errors/achievement-error-codes.js';
export type { AchievementErrorCode } from './errors/achievement-error-codes.js';
export { InvalidAchievementCodeError } from './errors/invalid-achievement-code-error.js';
export { InvalidCriteriaError } from './errors/invalid-criteria-error.js';
export { AchievementAlreadyUnlockedError } from './errors/achievement-already-unlocked-error.js';
export { InvalidProgressValueError } from './errors/invalid-progress-value-error.js';
export { InvalidMetricTypeError } from './errors/invalid-metric-type-error.js';
export { InvalidOperatorError } from './errors/invalid-operator-error.js';
export { AchievementDefinitionNotFoundError } from './errors/achievement-definition-not-found-error.js';
export { AchievementCodeAlreadyExistsError } from './errors/achievement-code-already-exists-error.js';
export { InvalidAchievementDefinitionError } from './errors/invalid-achievement-definition-error.js';

// ── Value Objects ─────────────────────────────────────────────────────────────
export { AchievementDefinitionId } from './value-objects/achievement-definition-id.js';
export { UserAchievementProgressId } from './value-objects/user-achievement-progress-id.js';
export { AchievementCode } from './value-objects/achievement-code.js';
export { MetricType, AchievementMetricType } from './value-objects/achievement-metric-type.js';
export type { AchievementMetricTypeValue } from './value-objects/achievement-metric-type.js';
export { CriteriaOperator, CriteriaOperatorType } from './value-objects/criteria-operator.js';
export type { CriteriaOperatorValue } from './value-objects/criteria-operator.js';
export { TargetValue } from './value-objects/target-value.js';
export { CurrentValue } from './value-objects/current-value.js';
export { ProgressPercentage } from './value-objects/progress-percentage.js';
export {
  AchievementCategory,
  AchievementCategoryType,
} from './value-objects/achievement-category.js';
export type { AchievementCategoryValue } from './value-objects/achievement-category.js';
export { AchievementTier, AchievementTierType } from './value-objects/achievement-tier.js';
export type { AchievementTierValue } from './value-objects/achievement-tier.js';
export { AchievementCriteria } from './value-objects/achievement-criteria.js';
export type { TimeWindowValue } from './value-objects/achievement-criteria.js';
export { AchievementName } from './value-objects/achievement-name.js';
export { AchievementDescription } from './value-objects/achievement-description.js';
export { IconUrl } from './value-objects/icon-url.js';

// ── Aggregates ────────────────────────────────────────────────────────────────
export { AchievementDefinition } from './aggregates/achievement-definition.js';
export type { AchievementDefinitionProps } from './aggregates/achievement-definition.js';
export { UserAchievementProgress } from './aggregates/user-achievement-progress.js';
export type { UserAchievementProgressProps } from './aggregates/user-achievement-progress.js';

// ── Domain Events ─────────────────────────────────────────────────────────────
export { AchievementDefinitionCreatedEvent } from './events/achievement-definition-created-event.js';
export type { AchievementDefinitionCreatedPayload } from './events/achievement-definition-created-event.js';
export { AchievementDefinitionActivatedEvent } from './events/achievement-definition-activated-event.js';
export type { AchievementDefinitionActivatedPayload } from './events/achievement-definition-activated-event.js';
export { AchievementUnlockedEvent } from './events/achievement-unlocked-event.js';
export type { AchievementUnlockedPayload } from './events/achievement-unlocked-event.js';
export { AchievementProgressUpdatedEvent } from './events/achievement-progress-updated-event.js';
export type { AchievementProgressUpdatedPayload } from './events/achievement-progress-updated-event.js';

// ── Repositories ──────────────────────────────────────────────────────────────
export type { IAchievementDefinitionRepository } from './repositories/i-achievement-definition-repository.js';
export type { IUserAchievementProgressRepository } from './repositories/i-user-achievement-progress-repository.js';
