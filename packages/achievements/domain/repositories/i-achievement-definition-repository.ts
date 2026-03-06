import type { DomainError } from '@fittrack/core';
import type { Either } from '@fittrack/core';
import type { AchievementDefinition } from '../aggregates/achievement-definition.js';
import type { AchievementCode } from '../value-objects/achievement-code.js';
import type { MetricType } from '../value-objects/achievement-metric-type.js';

export interface IAchievementDefinitionRepository {
  save(definition: AchievementDefinition): Promise<Either<DomainError, void>>;

  findById(id: string): Promise<Either<DomainError, AchievementDefinition | null>>;

  findByCode(code: AchievementCode): Promise<Either<DomainError, AchievementDefinition | null>>;

  /** Returns all active definitions, ordered by creation date. */
  findActive(): Promise<Either<DomainError, AchievementDefinition[]>>;

  /** Returns all definitions (active and inactive), ordered by creation date. */
  findAll(): Promise<Either<DomainError, AchievementDefinition[]>>;

  /**
   * Returns active definitions whose criteria metric matches the given MetricType.
   * Used by event handlers to identify which achievements to evaluate.
   */
  findActiveByMetric(metric: MetricType): Promise<Either<DomainError, AchievementDefinition[]>>;
}
