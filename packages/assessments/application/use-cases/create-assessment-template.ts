import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AssessmentTemplate } from '../../domain/aggregates/assessment-template.js';
import { AssessmentTemplateTitle } from '../../domain/value-objects/assessment-template-title.js';
import type { IAssessmentTemplateRepository } from '../../domain/repositories/assessment-template-repository.js';
import type { CreateAssessmentTemplateInputDTO } from '../dtos/create-assessment-template-input-dto.js';
import type { CreateAssessmentTemplateOutputDTO } from '../dtos/create-assessment-template-output-dto.js';

/**
 * Creates a new AssessmentTemplate in DRAFT status.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): `professionalProfileId` from JWT.
 * 2. Title validation: 1–120 chars (AssessmentTemplateTitle value object).
 * 3. Temporal (ADR-0010): `createdAtUtc` must be a valid UTC ISO 8601 string.
 *    `logicalDay` is computed from `createdAtUtc` + `timezoneUsed`.
 * 4. Template starts with no fields — fields are added via AddTemplateField.
 *
 * ## No domain events
 *
 * No AssessmentTemplate lifecycle events emitted in MVP (ADR-0009 §5, Q8 decision
 * — no cross-context consumers identified).
 */
export class CreateAssessmentTemplate {
  constructor(private readonly templateRepository: IAssessmentTemplateRepository) {}

  async execute(
    dto: CreateAssessmentTemplateInputDTO,
  ): Promise<DomainResult<CreateAssessmentTemplateOutputDTO>> {
    // 1. Validate tenant ID (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Validate title
    const titleResult = AssessmentTemplateTitle.create(dto.title);
    if (titleResult.isLeft()) return left(titleResult.value);

    // 3. Parse and validate createdAtUtc (ADR-0010)
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    // 4. Compute logicalDay from createdAtUtc + timezoneUsed (ADR-0010)
    const logicalDayResult = LogicalDay.fromDate(createdAtUtcResult.value.value, dto.timezoneUsed);
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

    // 5. Create the AssessmentTemplate aggregate in DRAFT
    const templateResult = AssessmentTemplate.create({
      professionalProfileId: dto.professionalProfileId,
      title: titleResult.value,
      description: dto.description ?? null,
      createdAtUtc: createdAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
    });

    /* v8 ignore next */
    if (templateResult.isLeft()) return left(templateResult.value);

    const template = templateResult.value;

    await this.templateRepository.save(template);

    return right({
      assessmentTemplateId: template.id,
      professionalProfileId: template.professionalProfileId,
      title: template.title.value,
      description: template.description,
      status: template.status,
      contentVersion: template.contentVersion,
      logicalDay: template.logicalDay.value,
      timezoneUsed: template.timezoneUsed,
      createdAtUtc: template.createdAtUtc.toISO(),
    });
  }
}
