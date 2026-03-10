import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeCreatedPayload {
  readonly createdBy: string;
  readonly type: string;
  readonly visibility: string;
  readonly name: string;
  readonly category: string;
  readonly startDateUtc: string;
  readonly endDateUtc: string;
  readonly goalMetricType: string;
  readonly goalTargetValue: number;
  readonly maxParticipants: number | null;
  readonly rewardPolicy: string;
}

export class ChallengeCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeCreated' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeCreatedPayload>,
  ) {
    super(1);
  }
}
