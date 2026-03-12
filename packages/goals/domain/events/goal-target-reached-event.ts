import { BaseDomainEvent } from '@fittrack/core';

export interface GoalTargetReachedPayload {
  readonly clientId: string;
  readonly finalValue: number;
  readonly targetValue: number;
  readonly daysAhead: number;
}

export class GoalTargetReachedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalTargetReached' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalTargetReachedPayload>,
  ) {
    super(1);
  }
}
