import { BaseDomainEvent } from '@fittrack/core';

export class ProfessionalProfileReactivated extends BaseDomainEvent {
  readonly eventType = 'ProfessionalProfileReactivated';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<Record<string, unknown>>,
  ) {
    super(1);
  }
}
