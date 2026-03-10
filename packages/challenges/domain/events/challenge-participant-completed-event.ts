import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeParticipantCompletedPayload {
  readonly challengeId: string;
  readonly userId: string;
  readonly completedAtUtc: string;
  readonly finalProgress: number;
}

export class ChallengeParticipantCompletedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeParticipantCompleted' as const;
  readonly aggregateType = 'ChallengeParticipation' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeParticipantCompletedPayload>,
  ) {
    super(1);
  }
}
