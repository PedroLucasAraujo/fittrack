import { BaseDomainEvent } from '@fittrack/core';

export interface UserDisengagedPayload {
  readonly userId: string;
  readonly engagementLevel: string;
  readonly overallScore: number;
  readonly daysInactive: number;
  readonly lastActivityDate: string | null;
  readonly detectedAtUtc: string;
}

/**
 * Emitted when a user crosses the churn risk threshold (ADR-0058).
 *
 * Churn risk triggers (either condition):
 * 1. engagementLevel=VERY_LOW AND daysInactive≥7 AND trend=DECLINING
 * 2. currentStreak=0 AND previous streak was ≥30 days
 *
 * Consumers:
 * - Analytics.UserEngagementProjection → mark user as at_risk in dashboard
 * - Notifications (post-MVP) → alert professional and client
 */
export class UserDisengagedEvent extends BaseDomainEvent {
  readonly eventType = 'UserDisengaged';
  readonly aggregateType = 'UserEngagement';

  constructor(
    readonly aggregateId: string,
    readonly tenantId: string,
    readonly payload: Readonly<UserDisengagedPayload>,
  ) {
    super(1);
  }
}
