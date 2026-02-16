import { BaseDomainEvent } from '@fittrack/core';

export class ProfessionalProfileDeactivated extends BaseDomainEvent {
  readonly eventType = 'ProfessionalProfileDeactivated';
  readonly aggregateType = 'ProfessionalProfile';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{ previousRiskStatus: string }>,
  ) {
    super(1);
  }
}
