import { BaseDomainEvent } from '@fittrack/core';

export class ChargebackRegistered extends BaseDomainEvent {
  readonly eventType = 'ChargebackRegistered';
  readonly aggregateType = 'Transaction';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      clientId: string;
      servicePlanId: string;
      amountCents: number;
      currency: string;
    }>,
  ) {
    super(1);
  }
}
