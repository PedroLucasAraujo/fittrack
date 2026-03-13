import { BaseDomainEvent } from '@fittrack/core';

export interface EngagementImprovedPayload {
  readonly userId: string;
  readonly previousScore: number;
  readonly currentScore: number;
  readonly improvementPercentage: number;
  readonly detectedAtUtc: string;
}

/**
 * Emitted when a user's engagement score improves by ≥20% week-over-week (ADR-0058).
 *
 * Consumers:
 * - Achievements (post-MVP) → unlock "Comeback Kid" or engagement badges
 * - Notifications (post-MVP) → celebrate progress with client
 */
export class EngagementImprovedEvent extends BaseDomainEvent {
  readonly eventType = 'EngagementImproved';
  readonly aggregateType = 'UserEngagement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<EngagementImprovedPayload>,
  ) {
    super(1);
  }
}
