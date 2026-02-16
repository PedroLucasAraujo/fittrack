import { BaseDomainEvent } from '@fittrack/core';

export class ProfessionalProfileBanned extends BaseDomainEvent {
  readonly eventType = 'ProfessionalProfileBanned';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{ reason: string; previousStatus: string }>,
  ) {
    super(1);
  }
}
