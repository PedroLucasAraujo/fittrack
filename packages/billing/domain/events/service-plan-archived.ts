import { BaseDomainEvent } from '@fittrack/core';

export class ServicePlanArchived extends BaseDomainEvent {
  readonly eventType = 'ServicePlanArchived';
  readonly aggregateType = 'ServicePlan';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      name: string;
    }>,
  ) {
    super(1);
  }
}
