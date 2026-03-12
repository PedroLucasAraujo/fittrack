import { BaseDomainEvent } from '@fittrack/core';

export interface GoalCreatedPayload {
  readonly clientId: string;
  readonly professionalProfileId: string;
  readonly createdBy: string;
  readonly category: string;
  readonly metricType: string;
  readonly baselineValue: number;
  readonly targetValue: number;
  readonly unit: string;
  readonly targetDate: string | null;
  readonly priority: string;
}

export class GoalCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalCreated' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalCreatedPayload>,
  ) {
    super(1);
  }
}
