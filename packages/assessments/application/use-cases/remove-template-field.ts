import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentTemplateNotFoundError } from '../../domain/errors/assessment-template-not-found-error.js';
import type { IAssessmentTemplateRepository } from '../../domain/repositories/assessment-template-repository.js';
import type { RemoveTemplateFieldInputDTO } from '../dtos/remove-template-field-input-dto.js';
import type { RemoveTemplateFieldOutputDTO } from '../dtos/remove-template-field-output-dto.js';

/**
 * Removes a field from an AssessmentTemplate in DRAFT status.
 *
 * ## Enforced invariants
 *
 * 1. Template must exist and belong to the requesting tenant (ADR-0025).
 * 2. Template must be in DRAFT status (ADR-0011 §3 — field removal is
 *    prohibited after activation).
 * 3. Field must exist within the template (TemplateFieldNotFoundError).
 * 4. Remaining fields are reindexed (orderIndex is contiguous).
 *
 * ## No domain events — see Q8 decision.
 */
export class RemoveTemplateField {
  constructor(private readonly templateRepository: IAssessmentTemplateRepository) {}

  async execute(
    dto: RemoveTemplateFieldInputDTO,
  ): Promise<DomainResult<RemoveTemplateFieldOutputDTO>> {
    // 1. Load template (tenant-scoped, ADR-0025)
    const template = await this.templateRepository.findById(
      dto.assessmentTemplateId,
      dto.professionalProfileId,
    );
    if (!template) {
      return left(new AssessmentTemplateNotFoundError(dto.assessmentTemplateId));
    }

    // 2. Delegate removal to the aggregate (DRAFT-only guard + existence check inside)
    const removeResult = template.removeField(dto.fieldId);
    if (removeResult.isLeft()) return left(removeResult.value);

    await this.templateRepository.save(template);

    return right({
      assessmentTemplateId: template.id,
      removedFieldId: dto.fieldId,
      contentVersion: template.contentVersion,
      remainingFieldCount: template.fields.length,
    });
  }
}
