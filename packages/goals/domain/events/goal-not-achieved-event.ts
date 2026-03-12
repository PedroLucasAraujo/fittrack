import { BaseDomainEvent } from '@fittrack/core';

export interface GoalNotAchievedPayload {
  readonly clientId: string;
  readonly finalValue: number;
  readonly targetValue: number;
  /** Absolute gap between finalValue and targetValue. */
  readonly gap: number;
}

export class GoalNotAchievedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalNotAchieved' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalNotAchievedPayload>,
  ) {
    super(1);
  }
}
