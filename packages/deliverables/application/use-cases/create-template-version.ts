import { left, right, UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateName } from '../../domain/value-objects/template-name.js';
import { TemplateParameter } from '../../domain/value-objects/template-parameter.js';
import { TemplateNotFoundError } from '../../domain/errors/template-not-found-error.js';
import { TemplateNameAlreadyExistsError } from '../../domain/errors/template-name-already-exists-error.js';
import { DeliverableTemplateVersionedEvent } from '../../domain/events/deliverable-template-versioned-event.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { IDeliverableTemplateEventPublisher } from '../ports/deliverable-template-event-publisher-port.js';
import type { CreateTemplateVersionInputDTO } from '../dtos/create-template-version-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';
import { buildStructure } from './create-deliverable-template.js';

/**
 * Creates a new DeliverableTemplate version from an ACTIVE template.
 *
 * The source template must be ACTIVE. The new template starts at DRAFT with
 * version incremented by 1 and `previousVersionId` pointing to the source.
 *
 * Optional `changes` are applied to the new DRAFT before persisting.
 *
 * Dispatches `DeliverableTemplateVersioned` post-save (ADR-0009 §4, ADR-0047).
 */
export class CreateTemplateVersion {
  constructor(
    private readonly templateRepository: IDeliverableTemplateRepository,
    private readonly eventPublisher: IDeliverableTemplateEventPublisher,
  ) {}

  async execute(
    dto: CreateTemplateVersionInputDTO,
  ): Promise<DomainResult<DeliverableTemplateOutputDTO>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Parse createdAtUtc
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    // 3. Load source template (scoped to tenant — ADR-0025)
    const sourceTemplate = await this.templateRepository.findByIdAndProfessionalProfileId(
      dto.templateId,
      dto.professionalProfileId,
    );
    if (!sourceTemplate) return left(new TemplateNotFoundError(dto.templateId));

    // 4. Create new version (enforces ACTIVE guard)
    const newVersionResult = sourceTemplate.createNewVersion(createdAtUtcResult.value);
    if (newVersionResult.isLeft()) return left(newVersionResult.value);

    const newTemplate = newVersionResult.value;

    // 5. Apply optional changes to the new DRAFT
    if (dto.changes) {
      const changes: Parameters<typeof newTemplate.update>[0] = {};

      if (dto.changes.name !== undefined) {
        const nameResult = TemplateName.create(dto.changes.name);
        if (nameResult.isLeft()) return left(nameResult.value);

        // Check uniqueness only if name changed
        if (nameResult.value.value !== newTemplate.name.value) {
          const nameExists = await this.templateRepository.existsByProfessionalAndName(
            dto.professionalProfileId,
            nameResult.value.value,
          );
          if (nameExists) return left(new TemplateNameAlreadyExistsError());
        }

        changes.name = nameResult.value;
      }

      if (dto.changes.description !== undefined) changes.description = dto.changes.description;

      if (dto.changes.structure !== undefined) {
        const structureResult = buildStructure(newTemplate.type, dto.changes.structure);
        if (structureResult.isLeft()) return left(structureResult.value);
        changes.structure = structureResult.value;
      }

      if (dto.changes.parameters !== undefined) {
        const parameters: TemplateParameter[] = [];
        for (const p of dto.changes.parameters) {
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
        changes.parameters = parameters;
      }

      if (dto.changes.tags !== undefined) changes.tags = dto.changes.tags;

      const updateResult = newTemplate.update(changes);
      /* v8 ignore next */
      if (updateResult.isLeft()) return left(updateResult.value);
    }

    // 6. Persist new version
    await this.templateRepository.save(newTemplate);

    // 7. Publish event post-save (ADR-0009 §4)
    await this.eventPublisher.publishDeliverableTemplateVersioned(
      new DeliverableTemplateVersionedEvent(
        newTemplate.id,
        'DeliverableTemplate',
        dto.professionalProfileId,
        {
          newTemplateId: newTemplate.id,
          previousTemplateId: sourceTemplate.id,
          professionalProfileId: dto.professionalProfileId,
          newVersion: newTemplate.templateVersion.value,
        },
      ),
    );

    return right(toTemplateOutputDTO(newTemplate));
  }
}
