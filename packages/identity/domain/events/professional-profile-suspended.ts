import { BaseDomainEvent } from '@fittrack/core';

export class ProfessionalProfileSuspended extends BaseDomainEvent {
  readonly eventType = 'ProfessionalProfileSuspended';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<Record<string, unknown>>,
  ) {
    super(1);
  }
}
