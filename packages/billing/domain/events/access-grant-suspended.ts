import { BaseDomainEvent } from '@fittrack/core';

export class AccessGrantSuspended extends BaseDomainEvent {
  readonly eventType = 'AccessGrantSuspended';
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
