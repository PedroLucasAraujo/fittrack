import { BaseDomainEvent } from '@fittrack/core';

/**
 * Published by ArchiveDeliverableTemplate after a template transitions to ARCHIVED.
 */
export class DeliverableTemplateArchivedEvent extends BaseDomainEvent {
  readonly eventType = 'DeliverableTemplateArchived';

  constructor(
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      templateId: string;
      professionalProfileId: string;
      archivedAtUtc: string;
    }>,
  ) {
    super(1);
  }
}
