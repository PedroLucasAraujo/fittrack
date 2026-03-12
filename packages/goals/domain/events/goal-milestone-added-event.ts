import { BaseDomainEvent } from '@fittrack/core';

export interface GoalMilestoneAddedPayload {
  readonly clientId: string;
  readonly milestoneId: string;
  readonly milestoneName: string;
  readonly milestoneTargetValue: number;
  readonly addedBy: string;
}

export class GoalMilestoneAddedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalMilestoneAdded' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalMilestoneAddedPayload>,
  ) {
    super(1);
  }
}
