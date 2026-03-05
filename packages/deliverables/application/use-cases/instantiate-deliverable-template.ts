import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Deliverable } from '../../domain/aggregates/deliverable.js';
import { DeliverableTitle } from '../../domain/value-objects/deliverable-title.js';
import { DeliverableType } from '../../domain/enums/deliverable-type.js';
import { TemplateNotFoundError } from '../../domain/errors/template-not-found-error.js';
import { TemplateNotActiveError } from '../../domain/errors/template-not-active-error.js';
import { DeliverableTemplateInstantiatedEvent } from '../../domain/events/deliverable-template-instantiated-event.js';
import type { IDeliverableTemplateRepository } from '../../domain/repositories/deliverable-template-repository.js';
import type { IDeliverableRepository } from '../../domain/repositories/deliverable-repository.js';
import type { IDeliverableTemplateEventPublisher } from '../ports/deliverable-template-event-publisher-port.js';
import type { InstantiateDeliverableTemplateInputDTO } from '../dtos/instantiate-deliverable-template-input-dto.js';

export interface InstantiateDeliverableTemplateOutputDTO {
  deliverableId: string;
  templateId: string;
  templateVersion: number;
  professionalProfileId: string;
}

/**
 * Creates a Deliverable from a DeliverableTemplate (ADR-0011 snapshot rule).
 *
 * ## Snapshot semantics (ADR-0011)
 *
 * The Deliverable created is an independent snapshot. Changes to the template
 * after instantiation do NOT affect already-created Deliverables.
 *
 * ## Enforced invariants
 *
 * 1. Template must be ACTIVE (not DRAFT or ARCHIVED).
 * 2. Deliverable is created in DRAFT status from the template snapshot.
 * 3. One aggregate per transaction (ADR-0003): only the Deliverable is saved here.
 *    The `DeliverableTemplateInstantiated` event is dispatched post-save so that
 *    the event handler can increment `usageCount` in a separate transaction.
 *
 * ## Event dispatch (ADR-0009 §4, ADR-0047)
 *
 * `DeliverableTemplateInstantiated` is published after the Deliverable is
 * successfully persisted. The downstream handler is responsible for incrementing
 * the template's `usageCount` in its own transaction (ADR-0003).
 */
export class InstantiateDeliverableTemplate {
  constructor(
    private readonly templateRepository: IDeliverableTemplateRepository,
    private readonly deliverableRepository: IDeliverableRepository,
    private readonly eventPublisher: IDeliverableTemplateEventPublisher,
  ) {}

  async execute(
    dto: InstantiateDeliverableTemplateInputDTO,
  ): Promise<DomainResult<InstantiateDeliverableTemplateOutputDTO>> {
    // 1. Validate tenant id (ADR-0025)
    const profileIdResult = UniqueEntityId.create(dto.professionalProfileId);
    if (profileIdResult.isLeft()) return left(profileIdResult.value);

    // 2. Parse temporal fields (ADR-0010)
    const createdAtUtcResult = UTCDateTime.fromISO(dto.createdAtUtc);
    if (createdAtUtcResult.isLeft()) return left(createdAtUtcResult.value);

    const logicalDayResult = LogicalDay.fromDate(createdAtUtcResult.value.value, dto.timezoneUsed);
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

    // 3. Load template (scoped to tenant — ADR-0025)
    const template = await this.templateRepository.findByIdAndProfessionalProfileId(
      dto.templateId,
      dto.professionalProfileId,
    );
    if (!template) return left(new TemplateNotFoundError(dto.templateId));

    // 4. Guard: template must be ACTIVE
    if (!template.canBeInstantiated()) {
      return left(new TemplateNotActiveError(dto.templateId));
    }

    // 5. Produce snapshot (ADR-0011)
    const paramMap = dto.parameterValues
      ? new Map(Object.entries(dto.parameterValues))
      : new Map<string, string | number | boolean>();

    const snapshot = template.structure.toSnapshot(paramMap);

    // 6. Build Deliverable title from template name
    const titleResult = DeliverableTitle.create(template.name.value);
    /* v8 ignore next */
    if (titleResult.isLeft()) return left(titleResult.value);

    // 7. Create Deliverable in DRAFT from snapshot (ADR-0011)
    const deliverableResult = Deliverable.create({
      professionalProfileId: dto.professionalProfileId,
      title: titleResult.value,
      type: snapshot.type,
      description: snapshot.description,
      createdAtUtc: createdAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
      originTemplateId: template.id,
      originTemplateVersion: template.templateVersion.value,
    });

    /* v8 ignore next */
    if (deliverableResult.isLeft()) return left(deliverableResult.value);

    const deliverable = deliverableResult.value;

    // 8. Attach exercises for TRAINING_PRESCRIPTION (ADR-0011 §3)
    if (snapshot.type === DeliverableType.TRAINING_PRESCRIPTION) {
      for (const ex of snapshot.exercises) {
        const addResult = deliverable.addExercise({
          catalogItemId: null,
          catalogVersion: null,
          snapshotCreatedAtUtc: null,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          durationSeconds: ex.durationSeconds,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
        });
        /* v8 ignore next */
        if (addResult.isLeft()) return left(addResult.value);
      }
    }

    // 9. Persist Deliverable (ADR-0003: one aggregate per transaction)
    await this.deliverableRepository.save(deliverable);

    // 10. Publish event post-save (ADR-0009 §4)
    // The event handler is responsible for incrementing template.usageCount
    // in a separate transaction (ADR-0003).
    await this.eventPublisher.publishDeliverableTemplateInstantiated(
      new DeliverableTemplateInstantiatedEvent(
        template.id,
        'DeliverableTemplate',
        dto.professionalProfileId,
        {
          templateId: template.id,
          templateVersion: template.templateVersion.value,
          deliverableId: deliverable.id,
          professionalProfileId: dto.professionalProfileId,
          occurredAtUtc: dto.createdAtUtc,
        },
      ),
    );

    return right({
      deliverableId: deliverable.id,
      templateId: template.id,
      templateVersion: template.templateVersion.value,
      professionalProfileId: dto.professionalProfileId,
    });
  }
}
