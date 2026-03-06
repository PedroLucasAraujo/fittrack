import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AchievementCode } from '../../domain/value-objects/achievement-code.js';
import { AchievementName } from '../../domain/value-objects/achievement-name.js';
import { AchievementDescription } from '../../domain/value-objects/achievement-description.js';
import { AchievementCategory } from '../../domain/value-objects/achievement-category.js';
import { AchievementTier } from '../../domain/value-objects/achievement-tier.js';
import { AchievementCriteria } from '../../domain/value-objects/achievement-criteria.js';
import { IconUrl } from '../../domain/value-objects/icon-url.js';
import { AchievementDefinition } from '../../domain/aggregates/achievement-definition.js';
import { AchievementDefinitionCreatedEvent } from '../../domain/events/achievement-definition-created-event.js';
import type { IAchievementDefinitionRepository } from '../../domain/repositories/i-achievement-definition-repository.js';
import { AchievementCodeAlreadyExistsError } from '../../domain/errors/achievement-code-already-exists-error.js';
import type { IAchievementEventPublisher } from '../ports/i-achievement-event-publisher.js';
import type {
  CreateAchievementDefinitionInputDTO,
  CreateAchievementDefinitionOutputDTO,
} from '../dtos/create-achievement-definition-dto.js';

/**
 * Creates a new AchievementDefinition (platform admin operation).
 *
 * ## Enforced invariants
 * 1. code must be a valid, whitelisted AchievementCode.
 * 2. code must be unique — no two definitions share the same code.
 * 3. criteria must have valid metric, operator, and targetValue.
 * 4. Created in inactive state (must be explicitly activated).
 *
 * ## Post-creation
 * Dispatches AchievementDefinitionCreatedEvent for downstream consumers
 * to initialize UserAchievementProgress records.
 */
export class CreateAchievementDefinition {
  constructor(
    private readonly definitionRepo: IAchievementDefinitionRepository,
    private readonly eventPublisher: IAchievementEventPublisher,
  ) {}

  async execute(
    dto: CreateAchievementDefinitionInputDTO,
  ): Promise<DomainResult<CreateAchievementDefinitionOutputDTO>> {
    // 1. Validate code
    const codeResult = AchievementCode.create(dto.code);
    if (codeResult.isLeft()) return left(codeResult.value);

    // 2. Check uniqueness
    const existingResult = await this.definitionRepo.findByCode(codeResult.value);
    if (existingResult.isLeft()) return left(existingResult.value);
    if (existingResult.value !== null) {
      return left(new AchievementCodeAlreadyExistsError(dto.code));
    }

    // 3. Validate other VOs
    const nameResult = AchievementName.create(dto.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    const descriptionResult = AchievementDescription.create(dto.description);
    if (descriptionResult.isLeft()) return left(descriptionResult.value);

    const categoryResult = AchievementCategory.create(dto.category);
    if (categoryResult.isLeft()) return left(categoryResult.value);

    const tierResult = AchievementTier.create(dto.tier);
    if (tierResult.isLeft()) return left(tierResult.value);

    const criteriaResult = AchievementCriteria.create({
      metric: dto.metricType,
      operator: dto.operator,
      targetValue: dto.targetValue,
      ...(dto.timeWindow !== undefined ? { timeWindow: dto.timeWindow } : {}),
    });
    if (criteriaResult.isLeft()) return left(criteriaResult.value);

    const iconUrlResult = IconUrl.create(dto.iconUrl);
    if (iconUrlResult.isLeft()) return left(iconUrlResult.value);

    // 4. Create aggregate (inactive by default)
    const definitionResult = AchievementDefinition.create({
      code: codeResult.value,
      name: nameResult.value,
      description: descriptionResult.value,
      category: categoryResult.value,
      tier: tierResult.value,
      criteria: criteriaResult.value,
      iconUrl: iconUrlResult.value,
      isRepeatable: dto.isRepeatable ?? false,
    });
    /* v8 ignore next */
    if (definitionResult.isLeft()) return left(definitionResult.value);

    const definition = definitionResult.value;

    // 5. Persist
    const saveResult = await this.definitionRepo.save(definition);
    if (saveResult.isLeft()) return left(saveResult.value);

    // 6. Publish event (ADR-0009 §4)
    await this.eventPublisher.publishAchievementDefinitionCreated(
      new AchievementDefinitionCreatedEvent(definition.id, {
        definitionId: definition.id,
        code: definition.code.value,
        name: definition.name.value,
        category: definition.category.value,
        tier: definition.tier.value,
        metricType: definition.criteria.metric.value,
        targetValue: definition.criteria.targetValue.value,
      }),
    );

    return right({
      definitionId: definition.id,
      code: definition.code.value,
      name: definition.name.value,
      category: definition.category.value,
      tier: definition.tier.value,
      isActive: definition.isActive(),
      createdAtUtc: definition.createdAtUtc,
    });
  }
}
