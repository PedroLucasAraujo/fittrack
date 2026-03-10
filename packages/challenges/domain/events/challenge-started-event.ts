import { BaseDomainEvent } from '@fittrack/core';

export interface ChallengeStartedPayload {
  readonly startedAtUtc: string;
  readonly type: string;
  readonly name: string;
}

export class ChallengeStartedEvent extends BaseDomainEvent {
  readonly eventType = 'ChallengeStarted' as const;
  readonly aggregateType = 'Challenge' as const;

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<ChallengeStartedPayload>,
  ) {
    super(1);
  }
}
