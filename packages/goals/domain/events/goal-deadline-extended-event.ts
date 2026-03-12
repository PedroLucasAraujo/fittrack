import { BaseDomainEvent } from '@fittrack/core';

export interface GoalDeadlineExtendedPayload {
  readonly clientId: string;
  readonly oldDeadline: string | null;
  readonly newDeadline: string;
  readonly reason: string;
  readonly extendedBy: string;
}

export class GoalDeadlineExtendedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalDeadlineExtended' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalDeadlineExtendedPayload>,
  ) {
    super(1);
  }
}
