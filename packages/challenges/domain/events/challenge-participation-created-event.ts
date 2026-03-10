import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeParticipationCreatedPayload {
  readonly challengeId: string;
  readonly userId: string;
  readonly joinedAtUtc: string;
}

export class ChallengeParticipationCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeParticipationCreated' as const;
  readonly aggregateType = 'ChallengeParticipation' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeParticipationCreatedPayload>,
  ) {
    super(1);
  }
}
