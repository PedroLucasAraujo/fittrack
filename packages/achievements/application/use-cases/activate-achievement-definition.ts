import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AchievementDefinitionActivatedEvent } from '../../domain/events/achievement-definition-activated-event.js';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import { AchievementDefinitionNotFoundError } from '../../domain/errors/achievement-definition-not-found-error.js';
import type { IAchievementEventPublisher } from '../ports/i-achievement-event-publisher.js';
import type {
  ActivateAchievementDefinitionInputDTO,
  ActivateAchievementDefinitionOutputDTO,
} from '../dtos/activate-achievement-definition-dto.js';

/**
 * Activates an AchievementDefinition, making it eligible for unlock evaluation.
 */
export class ActivateAchievementDefinition {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly eventPublisher: IAchievementEventPublisher,
  ) {}

  async execute(
    dto: ActivateAchievementDefinitionInputDTO,
  ): Promise<DomainResult<ActivateAchievementDefinitionOutputDTO>> {
    const definitionResult = await this.definitionRepo.findById(dto.definitionId);
    if (definitionResult.isLeft()) return left(definitionResult.value);
    if (definitionResult.value === null) {
      return left(new AchievementDefinitionNotFoundError(dto.definitionId));
    }

    const definition = definitionResult.value;

    const activateResult = definition.activate();
    if (activateResult.isLeft()) return left(activateResult.value);

    const saveResult = await this.definitionRepo.save(definition);
    if (saveResult.isLeft()) return left(saveResult.value);

    await this.eventPublisher.publishAchievementDefinitionActivated(
      new AchievementDefinitionActivatedEvent(definition.id, {
        definitionId: definition.id,
        code: definition.code.value,
      }),
    );

    return right({
      definitionId: definition.id,
      code: definition.code.value,
      isActive: definition.isActive(),
    });
  }
}
