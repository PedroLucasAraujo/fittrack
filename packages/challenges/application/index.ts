// Use cases
export {
  CreateChallengeUseCase,
  JoinChallengeUseCase,
  UpdateChallengeProgressUseCase,
  CompleteChallengeUseCase,
  CancelChallengeUseCase,
  InviteToChallengeUseCase,
  AcceptChallengeInviteUseCase,
  GetActiveChallengesUseCase,
  GetChallengeLeaderboardUseCase,
  GetUserChallengeProgressUseCase,
} from './use-cases/index.js';

// Event handlers
export {
  OnChallengeProgressUpdated,
  OnMetricComputed,
  OnStreakIncremented,
  OnWorkoutExecutionRecorded,
} from './event-handlers/index.js';
export type {
  ChallengeProgressUpdatedEventPayload,
  MetricComputedEventPayload,
  StreakIncrementedEventPayload,
  WorkoutExecutionRecordedEventPayload,
} from './event-handlers/index.js';

// Read models
export { LeaderboardEntry, ChallengeLeaderboard } from './read-models/index.js';
export type {
  LeaderboardEntryProps,
  ChallengeLeaderboardProps,
  IChallengeLeaderboardRepository,
} from './read-models/index.js';

// Ports
export type { IChallengesEventPublisher } from './ports/index.js';

// DTOs
export type {
  CreateChallengeInputDTO,
  CreateChallengeOutputDTO,
  JoinChallengeInputDTO,
  JoinChallengeOutputDTO,
  UpdateChallengeProgressInputDTO,
  UpdateChallengeProgressOutputDTO,
  CompleteChallengeInputDTO,
  CompleteChallengeOutputDTO,
  CancelChallengeInputDTO,
  CancelChallengeOutputDTO,
  InviteToChallengeInputDTO,
  InviteToChallengeOutputDTO,
  AcceptChallengeInviteInputDTO,
  AcceptChallengeInviteOutputDTO,
  GetActiveChallengesInputDTO,
  ChallengeSummaryDTO,
  GetActiveChallengesOutputDTO,
  GetChallengeLeaderboardInputDTO,
  LeaderboardEntryDTO,
  GetChallengeLeaderboardOutputDTO,
  GetUserChallengeProgressInputDTO,
  GetUserChallengeProgressOutputDTO,
} from './dtos/index.js';
