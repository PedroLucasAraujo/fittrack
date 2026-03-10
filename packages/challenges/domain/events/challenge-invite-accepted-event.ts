import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeInviteAcceptedPayload {
  readonly challengeId: string;
  readonly userId: string;
  readonly acceptedAtUtc: string;
}

export class ChallengeInviteAcceptedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeInviteAccepted' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeInviteAcceptedPayload>,
  ) {
    super(1);
  }
}
