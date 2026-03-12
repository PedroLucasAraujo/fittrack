import { BaseDomainEvent } from '@fittrack/core';

export interface GoalProgressUpdatedPayload {
  readonly clientId: string;
  readonly currentValue: number;
  readonly progressPercentage: number;
  readonly source: string;
}

export class GoalProgressUpdatedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalProgressUpdated' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalProgressUpdatedPayload>,
  ) {
    super(1);
  }
}
