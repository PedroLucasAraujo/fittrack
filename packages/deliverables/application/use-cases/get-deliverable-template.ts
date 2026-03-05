import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateNotFoundError } from '../../domain/errors/template-not-found-error.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { GetDeliverableTemplateInputDTO } from '../dtos/get-deliverable-template-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';

/**
 * Returns a single DeliverableTemplate by id, scoped to the professional (ADR-0025).
 *
 * Read-only use case — no events dispatched.
 */
export class GetDeliverableTemplate {
  constructor(private readonly templateRepository: IDeliverableTemplateRepository) {}

  async execute(
    dto: GetDeliverableTemplateInputDTO,
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

    return right(toTemplateOutputDTO(template));
  }
}
