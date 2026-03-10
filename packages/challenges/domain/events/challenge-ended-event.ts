import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeEndedPayload {
  readonly endedAtUtc: string;
  readonly name: string;
}

export class ChallengeEndedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeEnded' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeEndedPayload>,
  ) {
    super(1);
  }
}
