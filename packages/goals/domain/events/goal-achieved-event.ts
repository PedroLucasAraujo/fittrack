import { BaseDomainEvent } from '@fittrack/core';

export interface GoalAchievedPayload {
  readonly clientId: string;
  readonly finalValue: number;
  readonly targetValue: number;
  /** Duration in days from startedAt to completedAt. */
  readonly durationDays: number;
}

export class GoalAchievedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalAchieved' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalAchievedPayload>,
  ) {
    super(1);
  }
}
