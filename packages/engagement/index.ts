// ── Domain — Errors ───────────────────────────────────────────────────────────
export { EngagementErrorCodes } from './domain/errors/engagement-error-codes.js';
export type { EngagementErrorCode } from './domain/errors/engagement-error-codes.js';
export { InvalidEngagementScoreError } from './domain/errors/InvalidEngagementScoreError.js';
export { InvalidEngagementLevelError } from './domain/errors/InvalidEngagementLevelError.js';
export { InvalidEngagementTrendError } from './domain/errors/InvalidEngagementTrendError.js';
export { EngagementNotFoundError } from './domain/errors/EngagementNotFoundError.js';
export { InvalidEngagementError } from './domain/errors/InvalidEngagementError.js';

// ── Domain — Value Objects ────────────────────────────────────────────────────
export { EngagementScore } from './domain/value-objects/EngagementScore.js';
export { EngagementLevel } from './domain/value-objects/EngagementLevel.js';
export type { EngagementLevelValue } from './domain/value-objects/EngagementLevel.js';
export { EngagementTrend } from './domain/value-objects/EngagementTrend.js';
export type { EngagementTrendValue } from './domain/value-objects/EngagementTrend.js';
export { TrendPercentage } from './domain/value-objects/TrendPercentage.js';
export { DaysInactive } from './domain/value-objects/DaysInactive.js';

// ── Domain — Entities ─────────────────────────────────────────────────────────
export { EngagementHistory } from './domain/entities/EngagementHistory.js';
export type { EngagementHistoryProps } from './domain/entities/EngagementHistory.js';

// ── Domain — Aggregates ───────────────────────────────────────────────────────
export { UserEngagement } from './domain/aggregates/UserEngagement.js';
export type {
  UserEngagementProps,
  UpdateScoresInput,
  UpdateScoresOutcome,
} from './domain/aggregates/UserEngagement.js';

// ── Domain — Events ───────────────────────────────────────────────────────────
export { EngagementScoreCalculatedEvent } from './domain/events/EngagementScoreCalculatedEvent.js';
export type { EngagementScoreCalculatedPayload } from './domain/events/EngagementScoreCalculatedEvent.js';
export { UserDisengagedEvent } from './domain/events/UserDisengagedEvent.js';
export type { UserDisengagedPayload } from './domain/events/UserDisengagedEvent.js';
export { EngagementImprovedEvent } from './domain/events/EngagementImprovedEvent.js';
export type { EngagementImprovedPayload } from './domain/events/EngagementImprovedEvent.js';

// ── Domain — Repositories ─────────────────────────────────────────────────────
export type { IUserEngagementRepository } from './domain/repositories/IUserEngagementRepository.js';

// ── Domain — Services (ACL) ───────────────────────────────────────────────────
export type { IEngagementDataQueryService } from './domain/services/IEngagementDataQueryService.js';

// ── Application — Ports ───────────────────────────────────────────────────────
export type { IEngagementEventPublisher } from './application/ports/IEngagementEventPublisher.js';

// ── Application — DTOs ────────────────────────────────────────────────────────
export type {
  CalculateUserEngagementInputDTO,
  CalculateUserEngagementOutputDTO,
} from './application/dtos/CalculateUserEngagementDTO.js';
export type {
  GetEngagementHistoryInputDTO,
  GetEngagementHistoryOutputDTO,
  EngagementHistoryItemDTO,
} from './application/dtos/GetEngagementHistoryDTO.js';

// ── Application — Use Cases ───────────────────────────────────────────────────
export { CalculateUserEngagementUseCase } from './application/use-cases/CalculateUserEngagementUseCase.js';
export { GetEngagementHistoryUseCase } from './application/use-cases/GetEngagementHistoryUseCase.js';

// ── Application — Event Handlers ──────────────────────────────────────────────
export { OnExecutionRecorded } from './application/event-handlers/OnExecutionRecorded.js';
export { OnSelfLogRecorded } from './application/event-handlers/OnSelfLogRecorded.js';
export { OnBookingCompleted } from './application/event-handlers/OnBookingCompleted.js';
export { OnStreakBroken } from './application/event-handlers/OnStreakBroken.js';
export { OnGoalProgressUpdated } from './application/event-handlers/OnGoalProgressUpdated.js';

// ── Jobs ──────────────────────────────────────────────────────────────────────
export { CalculateAllEngagementScoresJob } from './jobs/CalculateAllEngagementScoresJob.js';
export type { IScheduledJob } from './shared/jobs/IScheduledJob.js';
export { JobResult } from './shared/jobs/JobResult.js';
