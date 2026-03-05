import { left, right, UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DeliverableTemplate } from '../../domain/aggregates/deliverable-template.js';
import { TemplateName } from '../../domain/value-objects/template-name.js';
import { TemplateParameter } from '../../domain/value-objects/template-parameter.js';
import { WorkoutTemplateStructure } from '../../domain/value-objects/template-structure/workout-template-structure.js';
import { DietTemplateStructure } from '../../domain/value-objects/template-structure/diet-template-structure.js';
import { AssessmentTemplateStructure } from '../../domain/value-objects/template-structure/assessment-template-structure.js';
import type { ITemplateStructure } from '../../domain/value-objects/template-structure/i-template-structure.js';
import { DeliverableType } from '../../domain/enums/deliverable-type.js';
import { InvalidTemplateStructureError } from '../../domain/errors/invalid-template-structure-error.js';
import { TemplateNameAlreadyExistsError } from '../../domain/errors/template-name-already-exists-error.js';
import { DeliverableTemplateCreatedEvent } from '../../domain/events/deliverable-template-created-event.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { IDeliverableTemplateEventPublisher } from '../ports/deliverable-template-event-publisher-port.js';
import type { CreateDeliverableTemplateInputDTO } from '../dtos/create-deliverable-template-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';

/**
 * Creates a new DeliverableTemplate in DRAFT status.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): `professionalProfileId` from JWT, validated as UUID.
 * 2. Name uniqueness: unique per professional.
 * 3. Structure validity: parsed and type-checked according to `type`.
 * 4. Template starts in DRAFT: must call ActivateDeliverableTemplate before instantiation.
 *
 * Dispatches `DeliverableTemplateCreated` post-save (ADR-0009 §4, ADR-0047).
 */
export class CreateDeliverableTemplate {
  constructor(
    private readonly templateRepository: IDeliverableTemplateRepository,
    private readonly eventPublisher: IDeliverableTemplateEventPublisher,
  ) {}

  async execute(
    dto: CreateDeliverableTemplateInputDTO,
  ): Promise<DomainResult<DeliverableTemplateOutputDTO>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Validate name
    const nameResult = TemplateName.create(dto.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    // 3. Check name uniqueness
    const nameExists = await this.templateRepository.existsByProfessionalAndName(
      dto.professionalProfileId,
      nameResult.value.value,
    );
    if (nameExists) return left(new TemplateNameAlreadyExistsError());

    // 4. Parse createdAtUtc
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    // 5. Build structure from DTO
    const structureResult = buildStructure(dto.type, dto.structure);
    if (structureResult.isLeft()) return left(structureResult.value);

    // 6. Build parameters
    const parameters: TemplateParameter[] = [];
    for (const p of dto.parameters ?? []) {
      const paramResult = TemplateParameter.create({
        name: p.name,
        type: p.type,
        required: p.required,
        defaultValue: p.defaultValue,
        min: p.min ?? null,
        max: p.max ?? null,
        options: p.options ?? null,
      });
      if (paramResult.isLeft()) return left(paramResult.value);
      parameters.push(paramResult.value);
    }

    // 7. Create aggregate
    const templateResult = DeliverableTemplate.create({
      professionalProfileId: dto.professionalProfileId,
      name: nameResult.value,
      description: dto.description ?? null,
      type: dto.type,
      structure: structureResult.value,
      parameters,
      tags: dto.tags ?? [],
      createdAtUtc: createdAtUtcResult.value,
    });

    /* v8 ignore next */
    if (templateResult.isLeft()) return left(templateResult.value);

    const template = templateResult.value;

    // 8. Persist
    await this.templateRepository.save(template);

    // 9. Publish event post-save (ADR-0009 §4)
    await this.eventPublisher.publishDeliverableTemplateCreated(
      new DeliverableTemplateCreatedEvent(
        template.id,
        'DeliverableTemplate',
        dto.professionalProfileId,
        {
          templateId: template.id,
          professionalProfileId: dto.professionalProfileId,
          name: template.name.value,
          type: template.type,
          version: template.templateVersion.value,
        },
      ),
    );

    return right(toTemplateOutputDTO(template));
  }
}

/**
 * Parses the raw structure `Record<string, unknown>` into the appropriate
 * typed structure based on `DeliverableType`.
 */
export function buildStructure(
  type: DeliverableType,
  raw: Record<string, unknown>,
): DomainResult<ITemplateStructure> {
  switch (type) {
    case DeliverableType.TRAINING_PRESCRIPTION: {
      const sessions = raw['sessions'];
      if (!Array.isArray(sessions)) {
        return left(
          new InvalidTemplateStructureError(
            'TRAINING_PRESCRIPTION structure must include a "sessions" array',
          ),
        );
      }
      return right(
        WorkoutTemplateStructure.create(
          sessions as Parameters<typeof WorkoutTemplateStructure.create>[0],
        ),
      );
    }

    case DeliverableType.DIET_PLAN: {
      const meals = raw['meals'];
      if (!Array.isArray(meals)) {
        return left(
          new InvalidTemplateStructureError('DIET_PLAN structure must include a "meals" array'),
        );
      }
      return right(
        DietTemplateStructure.create(meals as Parameters<typeof DietTemplateStructure.create>[0]),
      );
    }

    case DeliverableType.PHYSIOLOGICAL_ASSESSMENT: {
      const questions = raw['questions'];
      if (!Array.isArray(questions)) {
        return left(
          new InvalidTemplateStructureError(
            'PHYSIOLOGICAL_ASSESSMENT structure must include a "questions" array',
          ),
        );
      }
      return right(
        AssessmentTemplateStructure.create(
          questions as Parameters<typeof AssessmentTemplateStructure.create>[0],
        ),
      );
    }

    /* v8 ignore next 3 */
    default: {
      return left(
        new InvalidTemplateStructureError(`unsupported template type: ${type as string}`),
      );
    }
  }
}
