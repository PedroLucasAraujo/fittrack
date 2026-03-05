import { left, right, UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateNotFoundError } from '../../domain/errors/template-not-found-error.js';
import { DeliverableTemplateArchivedEvent } from '../../domain/events/deliverable-template-archived-event.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { IDeliverableTemplateEventPublisher } from '../ports/deliverable-template-event-publisher-port.js';
import type { ArchiveDeliverableTemplateInputDTO } from '../dtos/archive-deliverable-template-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';

/**
 * Archives a DeliverableTemplate (DRAFT or ACTIVE → ARCHIVED).
 *
 * Archived templates cannot be instantiated. Existing Deliverables created
 * from this template are not affected (ADR-0011 snapshot semantics).
 *
 * Dispatches `DeliverableTemplateArchived` post-save (ADR-0009 §4, ADR-0047).
 */
export class ArchiveDeliverableTemplate {
  constructor(
    private readonly templateRepository: IDeliverableTemplateRepository,
    private readonly eventPublisher: IDeliverableTemplateEventPublisher,
  ) {}

  async execute(
    dto: ArchiveDeliverableTemplateInputDTO,
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

    // 3. Archive
    const archiveResult = template.archive();
    if (archiveResult.isLeft()) return left(archiveResult.value);

    // 4. Persist
    await this.templateRepository.save(template);

    // 5. Publish event post-save (ADR-0009 §4)
    await this.eventPublisher.publishDeliverableTemplateArchived(
      new DeliverableTemplateArchivedEvent(
        template.id,
        'DeliverableTemplate',
        dto.professionalProfileId,
        {
          templateId: template.id,
          professionalProfileId: dto.professionalProfileId,
          archivedAtUtc: (template.archivedAtUtc ?? UTCDateTime.now()).value.toISOString(),
        },
      ),
    );

    return right(toTemplateOutputDTO(template));
  }
}
