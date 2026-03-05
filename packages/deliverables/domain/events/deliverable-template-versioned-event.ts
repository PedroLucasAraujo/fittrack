import { BaseDomainEvent } from '@fittrack/core';

/**
 * Published by CreateTemplateVersion after a new version is created from an ACTIVE template.
 */
export class DeliverableTemplateVersionedEvent extends BaseDomainEvent {
  readonly eventType = 'DeliverableTemplateVersioned';

  constructor(
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      newTemplateId: string;
      previousTemplateId: string;
      professionalProfileId: string;
      newVersion: number;
    }>,
  ) {
    super(1);
  }
}
