import { BaseDomainEvent } from '@fittrack/core';

export interface AchievementDefinitionCreatedPayload {
  readonly definitionId: string;
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly tier: string;
  readonly metricType: string;
  readonly targetValue: number;
}

/**
 * Emitted when a new AchievementDefinition is created (ADR-0009 §4).
 * Downstream consumers can initialize UserAchievementProgress records.
 */
export class AchievementDefinitionCreatedEvent extends BaseDomainEvent {
  readonly eventType = 'AchievementDefinitionCreated' as const;
  readonly aggregateType = 'AchievementDefinition' as const;
  /** tenantId is empty string — achievements definitions are platform-wide, not tenant-scoped. */
  readonly tenantId = '' as const;

  constructor(
    readonly aggregateId: string,
    readonly payload: Readonly<AchievementDefinitionCreatedPayload>,
  ) {
    super(1);
  }
}
