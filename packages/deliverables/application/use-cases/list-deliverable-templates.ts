import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { ListDeliverableTemplatesInputDTO } from '../dtos/list-deliverable-templates-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';

/**
 * Returns templates for a professional, optionally filtered by status or type.
 *
 * Read-only use case — no events dispatched.
 */
export class ListDeliverableTemplates {
  constructor(private readonly templateRepository: IDeliverableTemplateRepository) {}

  async execute(
    dto: ListDeliverableTemplatesInputDTO,
  ): Promise<DomainResult<DeliverableTemplateOutputDTO[]>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Query with filters
    let templates;

    if (dto.type !== undefined) {
      templates = await this.templateRepository.findByType(dto.professionalProfileId, dto.type);
    } else if (dto.activeOnly) {
      templates = await this.templateRepository.findActiveByProfessional(dto.professionalProfileId);
    } else {
      templates = await this.templateRepository.findByProfessional(dto.professionalProfileId);
    }

    return right(templates.map(toTemplateOutputDTO));
  }
}
