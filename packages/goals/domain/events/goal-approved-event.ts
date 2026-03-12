import { BaseDomainEvent } from '@fittrack/core';

export interface GoalApprovedPayload {
  readonly clientId: string;
  readonly professionalProfileId: string;
}

export class GoalApprovedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalApproved' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalApprovedPayload>,
  ) {
    super(1);
  }
}
