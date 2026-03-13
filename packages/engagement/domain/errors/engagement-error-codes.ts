/**
 * Error code registry for the Engagement bounded context.
 *
 * Namespaced with `ENGAGEMENT.` prefix to avoid collisions across contexts.
 */
export const EngagementErrorCodes = {
  INVALID_SCORE: 'ENGAGEMENT.INVALID_SCORE',
  INVALID_LEVEL: 'ENGAGEMENT.INVALID_LEVEL',
  INVALID_TREND: 'ENGAGEMENT.INVALID_TREND',
  INVALID_TREND_PERCENTAGE: 'ENGAGEMENT.INVALID_TREND_PERCENTAGE',
  INVALID_DAYS_INACTIVE: 'ENGAGEMENT.INVALID_DAYS_INACTIVE',
  INVALID_ENGAGEMENT: 'ENGAGEMENT.INVALID_ENGAGEMENT',
  ENGAGEMENT_NOT_FOUND: 'ENGAGEMENT.ENGAGEMENT_NOT_FOUND',
  INVALID_HISTORY_ENTRY: 'ENGAGEMENT.INVALID_HISTORY_ENTRY',
} as const;

export type EngagementErrorCode =
  (typeof EngagementErrorCodes)[keyof typeof EngagementErrorCodes];
