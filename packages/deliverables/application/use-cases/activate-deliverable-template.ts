import { left, right, UniqueEntityId, UTCDateTime } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { TemplateNotFoundError } from '../../domain/errors/template-not-found-error.js';
import { DeliverableTemplateActivatedEvent } from '../../domain/events/deliverable-template-activated-event.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { IDeliverableTemplateEventPublisher } from '../ports/deliverable-template-event-publisher-port.js';
import type { ActivateDeliverableTemplateInputDTO } from '../dtos/activate-deliverable-template-input-dto.js';
import type { DeliverableTemplateOutputDTO } from '../dtos/deliverable-template-output-dto.js';
import { toTemplateOutputDTO } from './shared/to-template-output-dto.js';

/**
 * Transitions a DeliverableTemplate from DRAFT → ACTIVE.
 *
 * Validates the structure before activation. The template must be in DRAFT status.
 * Once ACTIVE, the template cannot be edited; CreateTemplateVersion must be used instead.
 *
 * Dispatches `DeliverableTemplateActivated` post-save (ADR-0009 §4, ADR-0047).
 */
export class ActivateDeliverableTemplate {
  constructor(
    private readonly templateRepository: IDeliverableTemplateRepository,
    private readonly eventPublisher: IDeliverableTemplateEventPublisher,
  ) {}

  async execute(
    dto: ActivateDeliverableTemplateInputDTO,
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

    // 3. Activate (validates structure internally)
    const activateResult = template.activate();
    if (activateResult.isLeft()) return left(activateResult.value);

    // 4. Persist
    await this.templateRepository.save(template);

    // 5. Publish event post-save (ADR-0009 §4)
    await this.eventPublisher.publishDeliverableTemplateActivated(
      new DeliverableTemplateActivatedEvent(
        template.id,
        'DeliverableTemplate',
        dto.professionalProfileId,
        {
          templateId: template.id,
          professionalProfileId: dto.professionalProfileId,
          version: template.templateVersion.value,
          activatedAtUtc: (template.activatedAtUtc ?? UTCDateTime.now()).value.toISOString(),
        },
      ),
    );

    return right(toTemplateOutputDTO(template));
  }
}
