import { BaseDomainEvent } from '@fittrack/core';

export interface GoalStartedPayload {
  readonly clientId: string;
  readonly baselineValue: number;
  readonly targetValue: number;
  readonly unit: string;
}

export class GoalStartedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalStarted' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalStartedPayload>,
  ) {
    super(1);
  }
}
