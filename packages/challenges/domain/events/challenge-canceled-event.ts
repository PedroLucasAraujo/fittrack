import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeCanceledPayload {
  readonly canceledAtUtc: string;
  readonly reason: string;
  readonly name: string;
}

export class ChallengeCanceledEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeCanceled' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeCanceledPayload>,
  ) {
    super(1);
  }
}
