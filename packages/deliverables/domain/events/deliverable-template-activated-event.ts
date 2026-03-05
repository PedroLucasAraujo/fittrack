import { BaseDomainEvent } from '@fittrack/core';

/**
 * Published by ActivateDeliverableTemplate after a template transitions to ACTIVE.
 */
export class DeliverableTemplateActivatedEvent extends BaseDomainEvent {
  readonly eventType = 'DeliverableTemplateActivated';

  constructor(
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      templateId: string;
      professionalProfileId: string;
      version: number;
      activatedAtUtc: string;
    }>,
  ) {
    super(1);
  }
}
