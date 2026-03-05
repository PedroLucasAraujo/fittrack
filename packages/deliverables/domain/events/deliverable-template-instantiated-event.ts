import { BaseDomainEvent } from '@fittrack/core';

/**
 * Published by InstantiateDeliverableTemplate after a Deliverable is successfully
 * created from a template and the template's usageCount is incremented.
 */
export class DeliverableTemplateInstantiatedEvent extends BaseDomainEvent {
  readonly eventType = 'DeliverableTemplateInstantiated';

  constructor(
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      templateId: string;
      templateVersion: number;
      deliverableId: string;
      professionalProfileId: string;
      occurredAtUtc: string;
    }>,
  ) {
    super(1);
  }
}
