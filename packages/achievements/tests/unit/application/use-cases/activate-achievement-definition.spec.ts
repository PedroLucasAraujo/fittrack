import { describe, it, expect, beforeEach } from 'vitest';
import { left } from '@fittrack/core';
import type { DomainError, Either } from '@fittrack/core';
import { DomainError as CoreDomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { ActivateAchievementDefinition } from '../../../../application/use-cases/activate-achievement-definition.js';
import { AchievementErrorCodes } from '../../../../domain/errors/achievement-error-codes.js';
import { InMemoryAchievementDefinitionRepository } from '../../../repositories/in-memory-achievement-definition-repository.js';
import { FailingAchievementDefinitionRepository } from '../../../stubs/failing-repositories.js';
import { InMemoryAchievementEventPublisherStub } from '../../../stubs/in-memory-achievement-event-publisher-stub.js';
import { makeAchievementDefinition } from '../../../helpers/make-achievement-definition.js';
import type { AchievementDefinition } from '../../../../domain/aggregates/achievement-definition.js';

class StubError extends CoreDomainError {
  constructor() {
    super('stub', 'CORE.INTERNAL_ERROR' as ErrorCode);
  }
}

class SaveFailingDefinitionRepo extends InMemoryAchievementDefinitionRepository {
  failOnSave = false;
  override async save(def: AchievementDefinition): Promise<Either<DomainError, void>> {
    if (this.failOnSave) return left(new StubError() as DomainError);
    return super.save(def);
  }
}

describe('ActivateAchievementDefinition', () => {
  let definitionRepo: InMemoryAchievementDefinitionRepository;
  let eventPublisher: InMemoryAchievementEventPublisherStub;
  let useCase: ActivateAchievementDefinition;

  beforeEach(() => {
    definitionRepo = new InMemoryAchievementDefinitionRepository();
    eventPublisher = new InMemoryAchievementEventPublisherStub();
    useCase = new ActivateAchievementDefinition(definitionRepo, eventPublisher);
  });

  it('activates a definition and publishes AchievementDefinitionActivatedEvent', async () => {
    const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT' });
    await definitionRepo.save(definition);

    const result = await useCase.execute({ definitionId: definition.id });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.isActive).toBe(true);
      expect(result.value.code).toBe('FIRST_WORKOUT');
    }

    expect(eventPublisher.definitionActivatedEvents).toHaveLength(1);
    expect(eventPublisher.definitionActivatedEvents[0]!.payload.definitionId).toBe(definition.id);
  });

  it('returns Left when definition is not found', async () => {
    const result = await useCase.execute({ definitionId: 'non-existent-id' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AchievementErrorCodes.ACHIEVEMENT_DEFINITION_NOT_FOUND);
    }
  });

  it('returns Left when definition is already active', async () => {
    const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT', active: true });
    await definitionRepo.save(definition);

    const result = await useCase.execute({ definitionId: definition.id });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(AchievementErrorCodes.INVALID_ACHIEVEMENT_DEFINITION);
    }
    expect(eventPublisher.definitionActivatedEvents).toHaveLength(0);
  });

  it('returns Left when definitionRepo.findById fails', async () => {
    const failingUseCase = new ActivateAchievementDefinition(
      new FailingAchievementDefinitionRepository(),
      eventPublisher,
    );
    const result = await failingUseCase.execute({ definitionId: 'any-id' });
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when definitionRepo.save fails', async () => {
    const saveFailingRepo = new SaveFailingDefinitionRepo();
    const definition = makeAchievementDefinition({ code: 'FIRST_WORKOUT' });
    await saveFailingRepo.save(definition); // seed before enabling fail
    saveFailingRepo.failOnSave = true;
    const failingUseCase = new ActivateAchievementDefinition(saveFailingRepo, eventPublisher);
    const result = await failingUseCase.execute({ definitionId: definition.id });
    expect(result.isLeft()).toBe(true);
  });
});
