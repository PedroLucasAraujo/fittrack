/**
 * Canonical error code registry for the Gamification bounded context.
 *
 * Module-scoped codes follow the DOMAIN.CODE pattern to avoid collisions
 * with other bounded contexts.
 */
export const GamificationErrorCodes = {
  INVALID_STREAK_COUNT: 'GAMIFICATION.INVALID_STREAK_COUNT',
  INVALID_ACTIVITY_DAY: 'GAMIFICATION.INVALID_ACTIVITY_DAY',
  ACTIVITY_DAY_TOO_OLD: 'GAMIFICATION.ACTIVITY_DAY_TOO_OLD',
  NO_FREEZE_TOKENS_AVAILABLE: 'GAMIFICATION.NO_FREEZE_TOKENS_AVAILABLE',
  STREAK_NOT_AT_RISK: 'GAMIFICATION.STREAK_NOT_AT_RISK',
  STREAK_TRACKER_NOT_FOUND: 'GAMIFICATION.STREAK_TRACKER_NOT_FOUND',
  INVALID_USER_ID: 'GAMIFICATION.INVALID_USER_ID',
} as const;

export type GamificationErrorCode =
  (typeof GamificationErrorCodes)[keyof typeof GamificationErrorCodes];
