import { BaseDomainEvent } from '@fittrack/core';

export class ProfessionalProfileApproved extends BaseDomainEvent {
  readonly eventType = 'ProfessionalProfileApproved';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<Record<string, unknown>>,
  ) {
    super(1);
  }
}
