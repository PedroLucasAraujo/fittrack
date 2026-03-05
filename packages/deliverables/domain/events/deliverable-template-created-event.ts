import { BaseDomainEvent } from '@fittrack/core';
import type { DeliverableType } from '../enums/deliverable-type.js';

/**
 * Published by CreateDeliverableTemplate after a new template is persisted.
 *
 * The template is in DRAFT status at this point.
 */
export class DeliverableTemplateCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'DeliverableTemplateCreated';

  constructor(
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      templateId: string;
      professionalProfileId: string;
      name: string;
      type: DeliverableType;
      version: number;
    }>,
  ) {
    super(1);
  }
}
