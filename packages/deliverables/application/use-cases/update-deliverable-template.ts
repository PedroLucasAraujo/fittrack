import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateName } from '../../domain/value-objects/template-name.js';
import { TemplateParameter } from '../../domain/value-objects/template-parameter.js';
import { TemplateNameAlreadyExistsError } from '../../domain/errors/template-name-already-exists-error.js';
import { TemplateNotFoundError } from '../../domain/errors/template-not-found-error.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { UpdateDeliverableTemplateInputDTO } from '../dtos/update-deliverable-template-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';
import { buildStructure } from './create-deliverable-template.js';

/**
 * Updates the mutable fields of a DRAFT DeliverableTemplate.
 *
 * Only DRAFT templates may be edited. For ACTIVE templates, use
 * CreateTemplateVersion to produce a new DRAFT (v+1).
 */
export class UpdateDeliverableTemplate {
  constructor(private readonly templateRepository: IDeliverableTemplateRepository) {}

  async execute(
    dto: UpdateDeliverableTemplateInputDTO,
  ): Promise<DomainResult<DeliverableTemplateOutputDTO>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Load template (scoped to tenant — ADR-0025)
    const template = await this.templateRepository.findByIdAndProfessionalProfileId(
      dto.templateId,
      dto.professionalProfileId,
    );
    if (!template) return left(new TemplateNotFoundError(dto.templateId));

    // 3. Prepare changes
    const changes: Parameters<typeof template.update>[0] = {};

    // 3a. Validate and set name if changed
    if (dto.name !== undefined) {
      const nameResult = TemplateName.create(dto.name);
      if (nameResult.isLeft()) return left(nameResult.value);

      // Check uniqueness only if name actually changed
      if (nameResult.value.value !== template.name.value) {
        const nameExists = await this.templateRepository.existsByProfessionalAndName(
          dto.professionalProfileId,
          nameResult.value.value,
        );
        if (nameExists) return left(new TemplateNameAlreadyExistsError());
      }

      changes.name = nameResult.value;
    }

    if (dto.description !== undefined) changes.description = dto.description;

    if (dto.structure !== undefined) {
      const structureResult = buildStructure(template.type, dto.structure);
      if (structureResult.isLeft()) return left(structureResult.value);
      changes.structure = structureResult.value;
    }

    if (dto.parameters !== undefined) {
      const parameters: TemplateParameter[] = [];
      for (const p of dto.parameters) {
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

    if (dto.tags !== undefined) changes.tags = dto.tags;

    // 4. Apply changes (enforces DRAFT guard)
    const updateResult = template.update(changes);
    if (updateResult.isLeft()) return left(updateResult.value);

    // 5. Persist
    await this.templateRepository.save(template);

    return right(toTemplateOutputDTO(template));
  }
}
