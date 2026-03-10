import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeProgressUpdatedPayload {
  readonly challengeId: string;
  readonly userId: string;
  readonly previousProgress: number;
  readonly currentProgress: number;
  readonly progressPercentage: number;
  readonly updatedAtUtc: string;
}

export class ChallengeProgressUpdatedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeProgressUpdated' as const;
  readonly aggregateType = 'ChallengeParticipation' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeProgressUpdatedPayload>,
  ) {
    super(1);
  }
}
