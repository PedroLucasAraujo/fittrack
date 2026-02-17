import { BaseDomainEvent } from '@fittrack/core';

export class PaymentFailed extends BaseDomainEvent {
  readonly eventType = 'PaymentFailed';
  readonly aggregateType = 'Transaction';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      clientId: string;
      servicePlanId: string;
    }>,
  ) {
    super(1);
  }
}
