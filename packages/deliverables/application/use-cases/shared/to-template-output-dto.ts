import type { DeliverableTemplate } from '../../../domain/aggregates/deliverable-template.js';
import type { DeliverableTemplateOutputDTO } from '../../dtos/deliverable-template-output-dto.js';

/**
 * Maps a DeliverableTemplate aggregate to its output DTO.
 */
export function toTemplateOutputDTO(template: DeliverableTemplate): DeliverableTemplateOutputDTO {
  return {
    templateId: template.id,
    professionalProfileId: template.professionalProfileId,
    name: template.name.value,
    description: template.description,
    type: template.type,
    status: template.status,
    version: template.templateVersion.value,
    previousVersionId: template.previousVersionId,
    usageCount: template.usageCount,
    tags: [...template.tags],
    createdAtUtc: template.createdAtUtc.toISO(),
    updatedAtUtc: template.updatedAtUtc.toISO(),
    activatedAtUtc: template.activatedAtUtc?.toISO() ?? null,
    archivedAtUtc: template.archivedAtUtc?.toISO() ?? null,
  };
}
