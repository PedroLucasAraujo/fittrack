import { BaseDomainEvent } from '@fittrack/core';

export interface AchievementDefinitionActivatedPayload {
  readonly definitionId: string;
  readonly code: string;
}

/**
 * Emitted when an AchievementDefinition transitions from inactive to active (ADR-0009 §4).
 */
export class AchievementDefinitionActivatedEvent extends BaseDomainEvent {
  readonly eventType = 'AchievementDefinitionActivated' as const;
  readonly aggregateType = 'AchievementDefinition' as const;
  readonly tenantId = '' as const;

  constructor(
    readonly aggregateId: string,
    readonly payload: Readonly<AchievementDefinitionActivatedPayload>,
  ) {
    super(1);
  }
}
