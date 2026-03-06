import { describe, it, expect, beforeEach } from 'vitest';
import { left } from '@fittrack/core';
import type { DomainError, Either } from '@fittrack/core';
import { DomainError as CoreDomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { CreateAchievementDefinition } from '../../../../application/use-cases/create-achievement-definition.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { FailingAchievementDefinitionRepository } from '../../../stubs/failing-repositories.js';
import { InMemoryAchievementEventPublisherStub } from '../../../stubs/in-memory-achievement-event-publisher-stub.js';
import type { CreateAchievementDefinitionInputDTO } from '../../../../application/dtos/create-achievement-definition-dto.js';
import type { AchievementDefinition } from '../../../../domain/aggregates/achievement-definition.js';

class StubRepoError extends CoreDomainError {
  constructor() {
    super('stub', 'CORE.INTERNAL_ERROR' as ErrorCode);
  }
}

class SaveFailingDefinitionRepo extends InMemoryAchievementDefinitionRepository {
  override async save(_: AchievementDefinition): Promise<Either<DomainError, void>> {
    return left(new StubRepoError() as DomainError);
  }
}

function makeDTO(
  overrides: Partial<CreateAchievementDefinitionInputDTO> = {},
): CreateAchievementDefinitionInputDTO {
  return {
    code: 'FIRST_WORKOUT',
    name: 'First Workout',
    description: 'Complete your first workout',
    category: 'WORKOUT',
    tier: 'BRONZE',
    metricType: 'workout_count',
    operator: '>=',
    targetValue: 1,
    iconUrl: 'https://cdn.fittrack.com/achievements/first-workout.png',
    ...overrides,
  };
}

describe('CreateAchievementDefinition', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let eventPublisher: InMemoryAchievementEventPublisherStub;
  let useCase: CreateAchievementDefinition;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    eventPublisher = new InMemoryAchievementEventPublisherStub();
    useCase = new CreateAchievementDefinition(definitionRepo, eventPublisher);
  });

  it('creates a definition and publishes AchievementDefinitionCreatedEvent', async () => {
    const result = await useCase.execute(makeDTO());

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.code).toBe('FIRST_WORKOUT');
      expect(output.name).toBe('First Workout');
      expect(output.isActive).toBe(false);
      expect(output.definitionId).toBeTruthy();
    }

    expect(definitionRepo.size).toBe(1);
    expect(eventPublisher.definitionCreatedEvents).toHaveLength(1);
    expect(eventPublisher.definitionCreatedEvents[0]!.payload.code).toBe('FIRST_WORKOUT');
  });

  it('returns Left when code is invalid', async () => {
    const result = await useCase.execute(makeDTO({ code: 'invalid_code' }));
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_CODE);
    }
  });

  it('returns Left when code already exists (uniqueness)', async () => {
    await useCase.execute(makeDTO());
    const result = await useCase.execute(makeDTO());

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AchievementErrorCodes.ACHIEVEMENT_CODE_ALREADY_EXISTS);
    }
    expect(definitionRepo.size).toBe(1);
  });

  it('returns Left for invalid metric type', async () => {
    const result = await useCase.execute(makeDTO({ metricType: 'UNKNOWN' }));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left for invalid targetValue <= 0', async () => {
    const result = await useCase.execute(makeDTO({ targetValue: 0 }));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left for invalid category', async () => {
    const result = await useCase.execute(makeDTO({ category: 'INVALID' }));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left for invalid tier', async () => {
    const result = await useCase.execute(makeDTO({ tier: 'DIAMOND' }));
    expect(result.isLeft()).toBe(true);
  });

  it('does not publish event when validation fails', async () => {
    await useCase.execute(makeDTO({ code: 'bad' }));
    expect(eventPublisher.definitionCreatedEvents).toHaveLength(0);
  });

  it('returns Left when name is invalid (empty)', async () => {
    const result = await useCase.execute(makeDTO({ name: '' }));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when description is invalid (empty)', async () => {
    const result = await useCase.execute(makeDTO({ description: '' }));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when iconUrl is invalid (empty)', async () => {
    const result = await useCase.execute(makeDTO({ iconUrl: '' }));
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when definitionRepo.findByCode fails', async () => {
    const failingUseCase = new CreateAchievementDefinition(
      new FailingAchievementDefinitionRepository(),
      eventPublisher,
    );
    const result = await failingUseCase.execute(makeDTO());
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when definitionRepo.save fails', async () => {
    const failingUseCase = new CreateAchievementDefinition(
      new SaveFailingDefinitionRepo(),
      eventPublisher,
    );
    const result = await failingUseCase.execute(makeDTO());
    expect(result.isLeft()).toBe(true);
    expect(eventPublisher.definitionCreatedEvents).toHaveLength(0);
  });
});
