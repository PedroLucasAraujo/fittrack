// ── Domain ────────────────────────────────────────────────────────────────────
export { GamificationErrorCodes } from './domain/errors/gamification-error-codes.js';
export type { GamificationErrorCode } from './domain/errors/gamification-error-codes.js';
export { InvalidStreakCountError } from './domain/errors/invalid-streak-count-error.js';
export { InvalidActivityDayError } from './domain/errors/invalid-activity-day-error.js';
export { InvalidUserIdError } from './domain/errors/invalid-user-id-error.js';
export { ActivityDayTooOldError } from './domain/errors/activity-day-too-old-error.js';
export { NoFreezeTokensAvailableError } from './domain/errors/no-freeze-tokens-available-error.js';
export { StreakNotAtRiskError } from './domain/errors/streak-not-at-risk-error.js';
export { StreakTrackerNotFoundError } from './domain/errors/streak-tracker-not-found-error.js';

export { ActivityDay } from './domain/value-objects/activity-day.js';
export { LongestStreak } from './domain/value-objects/longest-streak.js';

export { StreakTracker, MAX_FREEZE_TOKENS } from './domain/aggregates/streak-tracker.js';
export type {
  StreakTrackerProps,
  ActivityRecordOutcome,
} from './domain/aggregates/streak-tracker.js';

export { StreakIncrementedEvent } from './domain/events/streak-incremented-event.js';
export type { StreakIncrementedPayload } from './domain/events/streak-incremented-event.js';
export { StreakBrokenEvent } from './domain/events/streak-broken-event.js';
export type { StreakBrokenPayload } from './domain/events/streak-broken-event.js';
export { FreezeTokenEarnedEvent } from './domain/events/freeze-token-earned-event.js';
export type { FreezeTokenEarnedPayload } from './domain/events/freeze-token-earned-event.js';
export { FreezeTokenUsedEvent } from './domain/events/freeze-token-used-event.js';
export type { FreezeTokenUsedPayload } from './domain/events/freeze-token-used-event.js';
export { StreakIntegrityViolationEvent } from './domain/events/streak-integrity-violation-event.js';
export type { StreakIntegrityViolationPayload } from './domain/events/streak-integrity-violation-event.js';

export type { IStreakTrackerRepository } from './domain/repositories/i-streak-tracker-repository.js';

// ── Application ───────────────────────────────────────────────────────────────
export type { IGamificationEventPublisher } from './application/ports/i-gamification-event-publisher.js';
export type { IGamificationExecutionQueryService } from './application/ports/i-gamification-execution-query-service.js';

export type {
  UpdateStreakTrackerInputDTO,
  UpdateStreakTrackerOutputDTO,
} from './application/dtos/update-streak-tracker-dto.js';
export type {
  UseStreakFreezeTokenInputDTO,
  UseStreakFreezeTokenOutputDTO,
} from './application/dtos/use-streak-freeze-token-dto.js';
export type {
  GetStreakStatusInputDTO,
  GetStreakStatusOutputDTO,
} from './application/dtos/get-streak-status-dto.js';

export { UpdateStreakTracker } from './application/use-cases/update-streak-tracker.js';
export { UseStreakFreezeToken } from './application/use-cases/use-streak-freeze-token.js';
export { GetStreakStatus } from './application/use-cases/get-streak-status.js';
export { CheckStreakIntegrity } from './application/use-cases/check-streak-integrity.js';
export type { CheckStreakIntegrityOutputDTO } from './application/use-cases/check-streak-integrity.js';

export { OnExecutionRecorded } from './application/event-handlers/on-execution-recorded.js';
export type { ExecutionRecordedForStreakPayload } from './application/event-handlers/on-execution-recorded.js';

// ── Jobs ──────────────────────────────────────────────────────────────────────
export { CheckStreakIntegrityJob } from './jobs/CheckStreakIntegrityJob.js';

// ── Job Infrastructure ────────────────────────────────────────────────────────
export type { IScheduledJob } from './shared/jobs/IScheduledJob.js';
export { JobResult } from './shared/jobs/JobResult.js';
