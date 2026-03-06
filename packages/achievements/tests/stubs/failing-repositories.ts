import { left } from '@fittrack/core';
import type { Either, DomainError } from '@fittrack/core';
import { DomainError as CoreDomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import type { IUserAchievementProgressRepository } from '../../domain/repositories/i-user-achievement-progress-repository.js';
import type { AchievementDefinition } from '../../domain/aggregates/achievement-definition.js';
import type { UserAchievementProgress } from '../../domain/aggregates/user-achievement-progress.js';
import type { AchievementCode } from '../../domain/value-objects/achievement-code.js';
import type { MetricType } from '../../domain/value-objects/achievement-metric-type.js';

class RepoError extends CoreDomainError {
  constructor() {
    super('Repository error', 'CORE.INTERNAL_ERROR' as ErrorCode);
  }
}

const repoError = () => left(new RepoError() as DomainError);

export class FailingAchievementDefinitionRepository implements IAchievementDefinitionRepository {
  async save(_: AchievementDefinition): Promise<Either<DomainError, void>> {
    return repoError();
  }
  async findById(_: string): Promise<Either<DomainError, AchievementDefinition | null>> {
    return repoError();
  }
  async findByCode(_: AchievementCode): Promise<Either<DomainError, AchievementDefinition | null>> {
    return repoError();
  }
  async findActive(): Promise<Either<DomainError, AchievementDefinition[]>> {
    return repoError();
  }
  async findAll(): Promise<Either<DomainError, AchievementDefinition[]>> {
    return repoError();
  }
  async findActiveByMetric(_: MetricType): Promise<Either<DomainError, AchievementDefinition[]>> {
    return repoError();
  }
}

export class FailingUserAchievementProgressRepository
  implements IUserAchievementProgressRepository
{
  async save(_: UserAchievementProgress): Promise<Either<DomainError, void>> {
    return repoError();
  }
  async findById(_: string): Promise<Either<DomainError, UserAchievementProgress | null>> {
    return repoError();
  }
  async findByUserId(_: string): Promise<Either<DomainError, UserAchievementProgress[]>> {
    return repoError();
  }
  async findUnlockedByUserId(_: string): Promise<Either<DomainError, UserAchievementProgress[]>> {
    return repoError();
  }
  async findInProgressByUserId(_: string): Promise<Either<DomainError, UserAchievementProgress[]>> {
    return repoError();
  }
  async findByUserAndDefinition(
    _: string,
    __: string,
  ): Promise<Either<DomainError, UserAchievementProgress | null>> {
    return repoError();
  }
  async existsByUserAndDefinition(_: string, __: string): Promise<Either<DomainError, boolean>> {
    return repoError();
  }
}
