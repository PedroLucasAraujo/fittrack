import { BaseDomainEvent } from '@fittrack/core';

export interface GoalMilestoneReachedPayload {
  readonly clientId: string;
  readonly milestoneId: string;
  readonly milestoneName: string;
  readonly reachedValue: number;
}

export class GoalMilestoneReachedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalMilestoneReached' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalMilestoneReachedPayload>,
  ) {
    super(1);
  }
}
