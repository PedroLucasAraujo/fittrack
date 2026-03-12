import { BaseDomainEvent } from '@fittrack/core';

export interface GoalRiskDetectedPayload {
  readonly clientId: string;
  readonly professionalProfileId: string;
  readonly riskLevel: 'HIGH' | 'VERY_HIGH';
  readonly reason: string;
}

export class GoalRiskDetectedEvent extends BaseDomainEvent {
  readonly eventType = 'GoalRiskDetected' as const;
  readonly aggregateType = 'Goal' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<GoalRiskDetectedPayload>,
  ) {
    super(1);
  }
}
