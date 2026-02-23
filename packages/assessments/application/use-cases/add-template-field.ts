import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateFieldLabel } from '../../domain/value-objects/template-field-label.js';
import { TemplateFieldType } from '../../domain/enums/template-field-type.js';
import { AssessmentTemplateNotFoundError } from '../../domain/errors/assessment-template-not-found-error.js';
import { InvalidAssessmentTemplateError } from '../../domain/errors/invalid-assessment-template-error.js';
import type { IAssessmentTemplateRepository } from '../../domain/repositories/assessment-template-repository.js';
import type { AddTemplateFieldInputDTO } from '../dtos/add-template-field-input-dto.js';
import type { AddTemplateFieldOutputDTO } from '../dtos/add-template-field-output-dto.js';

/**
 * Appends a new field to an AssessmentTemplate in DRAFT status.
 *
 * ## Enforced invariants
 *
 * 1. Template must exist and belong to the requesting tenant (ADR-0025).
 * 2. Template must be in DRAFT status (ADR-0011 §3 — field mutations are
 *    prohibited after activation).
 * 3. Label validation: 1–100 chars (TemplateFieldLabel value object).
 * 4. SELECT fields must provide at least 2 options.
 * 5. Non-SELECT fields must not provide options.
 *
 * ## No domain events — see Q8 decision.
 */
export class AddTemplateField {
  constructor(private readonly templateRepository: IAssessmentTemplateRepository) {}

  async execute(dto: AddTemplateFieldInputDTO): Promise<DomainResult<AddTemplateFieldOutputDTO>> {
    // 1. Load template (tenant-scoped, ADR-0025)
    const template = await this.templateRepository.findById(
      dto.assessmentTemplateId,
      dto.professionalProfileId,
    );
    if (!template) {
      return left(new AssessmentTemplateNotFoundError(dto.assessmentTemplateId));
    }

    // 2. Validate label
    const labelResult = TemplateFieldLabel.create(dto.label);
    if (labelResult.isLeft()) return left(labelResult.value);

    // 3. Validate SELECT field constraints
    if (dto.fieldType === TemplateFieldType.SELECT) {
      if (!dto.options || dto.options.length < 2) {
        return left(
          new InvalidAssessmentTemplateError('SELECT fields must have at least 2 options'),
        );
      }
    } else if (dto.options && dto.options.length > 0) {
      return left(
        new InvalidAssessmentTemplateError(
          `options are only valid for SELECT fields; received fieldType ${dto.fieldType}`,
        ),
      );
    }

    // 4. Validate unit is only for NUMBER fields
    if (dto.unit && dto.fieldType !== TemplateFieldType.NUMBER) {
      return left(
        new InvalidAssessmentTemplateError(
          `unit is only valid for NUMBER fields; received fieldType ${dto.fieldType}`,
        ),
      );
    }

    // 5. Delegate mutation to the aggregate (DRAFT-only guard enforced inside)
    const addResult = template.addField({
      label: labelResult.value,
      fieldType: dto.fieldType,
      unit: dto.unit ?? null,
      required: dto.required ?? false,
      /* v8 ignore next -- SELECT validation (lines 43-50) guarantees dto.options is set */
      options: dto.fieldType === TemplateFieldType.SELECT ? (dto.options ?? null) : null,
    });
    if (addResult.isLeft()) return left(addResult.value);

    const field = addResult.value;

    await this.templateRepository.save(template);

    return right({
      assessmentTemplateId: template.id,
      fieldId: field.id,
      label: field.label.value,
      fieldType: field.fieldType,
      unit: field.unit,
      required: field.required,
      options: field.options,
      orderIndex: field.orderIndex,
      contentVersion: template.contentVersion,
    });
  }
}
