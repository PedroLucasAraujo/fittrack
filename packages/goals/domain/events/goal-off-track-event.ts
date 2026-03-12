import { BaseDomainEvent } from '@fittrack/core';

export interface GoalOffTrackPayload {
  readonly clientId: string;
  readonly expectedProgress: number;
  readonly actualProgress: number;
  readonly daysRemaining: number;
}

export class GoalOffTrackEvent extends BaseDomainEvent {
  readonly eventType = 'GoalOffTrack' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalOffTrackPayload>,
  ) {
    super(1);
  }
}
