import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeCompletedPayload {
  readonly totalParticipants: number;
  readonly totalCompleted: number;
  readonly topRanks: ReadonlyArray<{ userId: string; rank: number; progress: number }>;
}

export class ChallengeCompletedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeCompleted' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeCompletedPayload>,
  ) {
    super(1);
  }
}
