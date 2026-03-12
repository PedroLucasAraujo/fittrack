import { BaseDomainEvent } from '@fittrack/core';

export interface GoalTargetAdjustedPayload {
  readonly clientId: string;
  readonly oldTarget: number;
  readonly newTarget: number;
  readonly reason: string;
  readonly adjustedBy: string;
}

export class GoalTargetAdjustedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalTargetAdjusted' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalTargetAdjustedPayload>,
  ) {
    super(1);
  }
}
