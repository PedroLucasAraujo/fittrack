import { BaseDomainEvent } from '@fittrack/core';

export class AccessGrantCreated extends BaseDomainEvent {
  readonly eventType = 'AccessGrantCreated';
  readonly aggregateType = 'AccessGrant';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      clientId: string;
      servicePlanId: string;
      transactionId: string;
      validFrom: string;
      validUntil: string | null;
    }>,
  ) {
    super(1);
  }
}
