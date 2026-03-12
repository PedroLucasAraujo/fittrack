import { BaseDomainEvent } from '@fittrack/core';

export interface GoalProgressRegressedPayload {
  readonly clientId: string;
  readonly previousValue: number;
  readonly currentValue: number;
}

export class GoalProgressRegressedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalProgressRegressed' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalProgressRegressedPayload>,
  ) {
    super(1);
  }
}
