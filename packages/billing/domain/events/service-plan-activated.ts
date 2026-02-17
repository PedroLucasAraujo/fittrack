import { BaseDomainEvent } from '@fittrack/core';

export class ServicePlanActivated extends BaseDomainEvent {
  readonly eventType = 'ServicePlanActivated';
  readonly aggregateType = 'ServicePlan';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      name: string;
      priceCents: number;
      currency: string;
    }>,
  ) {
    super(1);
  }
}
