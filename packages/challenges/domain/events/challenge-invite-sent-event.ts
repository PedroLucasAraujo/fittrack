import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeInviteSentPayload {
  readonly challengeId: string;
  readonly invitedBy: string;
  readonly invitedUserId: string;
  readonly sentAtUtc: string;
}

export class ChallengeInviteSentEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeInviteSent' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeInviteSentPayload>,
  ) {
    super(1);
  }
}
