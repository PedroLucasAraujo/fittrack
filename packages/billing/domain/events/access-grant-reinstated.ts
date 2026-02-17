import { BaseDomainEvent } from '@fittrack/core';

export class AccessGrantReinstated extends BaseDomainEvent {
  readonly eventType = 'AccessGrantReinstated';
  readonly aggregateType = 'AccessGrant';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      transactionId: string;
    }>,
  ) {
    super(1);
  }
}
