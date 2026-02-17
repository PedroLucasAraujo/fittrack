import { BaseDomainEvent } from '@fittrack/core';

export class AccessGrantRevoked extends BaseDomainEvent {
  readonly eventType = 'AccessGrantRevoked';
  readonly aggregateType = 'AccessGrant';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<{
      reason: string;
      transactionId: string;
    }>,
  ) {
    super(1);
  }
}
