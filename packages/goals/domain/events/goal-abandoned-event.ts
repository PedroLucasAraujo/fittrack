import { BaseDomainEvent } from '@fittrack/core';

export interface GoalAbandonedPayload {
  readonly clientId: string;
  readonly reason: string;
}

export class GoalAbandonedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalAbandoned' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalAbandonedPayload>,
  ) {
    super(1);
  }
}
