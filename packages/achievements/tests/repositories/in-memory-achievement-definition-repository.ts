import { right } from '@fittrack/core';
import type { Either, DomainError } from '@fittrack/core';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { AchievementDefinition } from '../../domain/aggregates/achievement-definition.js';
import type { AchievementCode } from '../../domain/value-objects/achievement-code.js';
import type { MetricType } from '../../domain/value-objects/achievement-metric-type.js';

export class InMemoryAchievementDefinitionRepository implements IAchievementDefinitionRepository {
  private store = new Map<string, AchievementDefinition>();

  async save(definition: AchievementDefinition): Promise<Either<DomainError, void>> {
    this.store.set(definition.id, definition);
    return right(undefined);
  }

  async findById(id: string): Promise<Either<DomainError, AchievementDefinition | null>> {
    return right(this.store.get(id) ?? null);
  }

  async findByCode(
    code: AchievementCode,
  ): Promise<Either<DomainError, AchievementDefinition | null>> {
    for (const definition of this.store.values()) {
      if (definition.code.equals(code)) return right(definition);
    }
    return right(null);
  }

  async findActive(): Promise<Either<DomainError, AchievementDefinition[]>> {
    const result = Array.from(this.store.values()).filter((d) => d.isActive());
    return right(result);
  }

  async findAll(): Promise<Either<DomainError, AchievementDefinition[]>> {
    return right(Array.from(this.store.values()));
  }

  async findActiveByMetric(
    metric: MetricType,
  ): Promise<Either<DomainError, AchievementDefinition[]>> {
    const result = Array.from(this.store.values()).filter(
      (d) => d.isActive() && d.criteria.metric.equals(metric),
    );
    return right(result);
  }

  /** Test helper — count of stored definitions. */
  get size(): number {
    return this.store.size;
  }

  /** Test helper — get all definitions. */
  all(): AchievementDefinition[] {
    return Array.from(this.store.values());
  }
}
