// ── Domain ────────────────────────────────────────────────────────────────────

// Errors
export { GoalsErrorCodes } from './domain/errors/goals-error-codes.js';
export type { GoalsErrorCode } from './domain/errors/goals-error-codes.js';
export { InvalidGoalCategoryError } from './domain/errors/invalid-goal-category-error.js';
export { InvalidGoalMetricError } from './domain/errors/invalid-goal-metric-error.js';
export { InvalidGoalNameError } from './domain/errors/invalid-goal-name-error.js';
export { InvalidGoalPriorityError } from './domain/errors/invalid-goal-priority-error.js';
export { InvalidProgressSourceError } from './domain/errors/invalid-progress-source-error.js';
export { InvalidProgressPercentageError } from './domain/errors/invalid-progress-percentage-error.js';
export { InvalidTargetDateError } from './domain/errors/invalid-target-date-error.js';
export { InvalidBaselineValueError } from './domain/errors/invalid-baseline-value-error.js';
export { InvalidTargetValueError } from './domain/errors/invalid-target-value-error.js';
export { InvalidMilestoneNameError } from './domain/errors/invalid-milestone-name-error.js';
export { InvalidMilestoneTargetError } from './domain/errors/invalid-milestone-target-error.js';
export { BaselineGreaterThanTargetError } from './domain/errors/baseline-greater-than-target-error.js';
export { GoalNotFoundError } from './domain/errors/goal-not-found-error.js';
export { GoalAlreadyApprovedError } from './domain/errors/goal-already-approved-error.js';
export { GoalAlreadyStartedError } from './domain/errors/goal-already-started-error.js';
export { GoalNotApprovedError } from './domain/errors/goal-not-approved-error.js';
export { GoalNotActiveError } from './domain/errors/goal-not-active-error.js';
export { GoalAlreadyCompletedError } from './domain/errors/goal-already-completed-error.js';
export { UnauthorizedProfessionalError } from './domain/errors/unauthorized-professional-error.js';

// Value Objects
export { GoalCategory } from './domain/value-objects/goal-category.js';
export type { GoalCategoryValue } from './domain/value-objects/goal-category.js';
export { GoalMetric, GOAL_METRICS } from './domain/value-objects/goal-metric.js';
export type { GoalMetricValue } from './domain/value-objects/goal-metric.js';
export { GoalName } from './domain/value-objects/goal-name.js';
export { GoalPriority } from './domain/value-objects/goal-priority.js';
export type { GoalPriorityValue } from './domain/value-objects/goal-priority.js';
export { ProgressSource } from './domain/value-objects/progress-source.js';
export type { ProgressSourceValue } from './domain/value-objects/progress-source.js';
export { ProgressPercentage } from './domain/value-objects/progress-percentage.js';
export { TargetDate } from './domain/value-objects/target-date.js';

// Entities
export { ProgressEntry } from './domain/entities/progress-entry.js';
export type { ProgressEntryProps } from './domain/entities/progress-entry.js';
export { Milestone } from './domain/entities/milestone.js';
export type { MilestoneProps } from './domain/entities/milestone.js';

// Events
export { GoalCreatedEvent } from './domain/events/goal-created-event.js';
export type { GoalCreatedPayload } from './domain/events/goal-created-event.js';
export { GoalApprovedEvent } from './domain/events/goal-approved-event.js';
export type { GoalApprovedPayload } from './domain/events/goal-approved-event.js';
export { GoalStartedEvent } from './domain/events/goal-started-event.js';
export type { GoalStartedPayload } from './domain/events/goal-started-event.js';
export { GoalProgressUpdatedEvent } from './domain/events/goal-progress-updated-event.js';
export type { GoalProgressUpdatedPayload } from './domain/events/goal-progress-updated-event.js';
export { GoalProgressRegressedEvent } from './domain/events/goal-progress-regressed-event.js';
export type { GoalProgressRegressedPayload } from './domain/events/goal-progress-regressed-event.js';
export { GoalMilestoneReachedEvent } from './domain/events/goal-milestone-reached-event.js';
export type { GoalMilestoneReachedPayload } from './domain/events/goal-milestone-reached-event.js';
export { GoalTargetReachedEvent } from './domain/events/goal-target-reached-event.js';
export type { GoalTargetReachedPayload } from './domain/events/goal-target-reached-event.js';
export { GoalOffTrackEvent } from './domain/events/goal-off-track-event.js';
export type { GoalOffTrackPayload } from './domain/events/goal-off-track-event.js';
export { GoalAchievedEvent } from './domain/events/goal-achieved-event.js';
export type { GoalAchievedPayload } from './domain/events/goal-achieved-event.js';
export { GoalNotAchievedEvent } from './domain/events/goal-not-achieved-event.js';
export type { GoalNotAchievedPayload } from './domain/events/goal-not-achieved-event.js';
export { GoalAbandonedEvent } from './domain/events/goal-abandoned-event.js';
export type { GoalAbandonedPayload } from './domain/events/goal-abandoned-event.js';
export { GoalTargetAdjustedEvent } from './domain/events/goal-target-adjusted-event.js';
export type { GoalTargetAdjustedPayload } from './domain/events/goal-target-adjusted-event.js';
export { GoalDeadlineExtendedEvent } from './domain/events/goal-deadline-extended-event.js';
export type { GoalDeadlineExtendedPayload } from './domain/events/goal-deadline-extended-event.js';
export { GoalRiskDetectedEvent } from './domain/events/goal-risk-detected-event.js';
export type { GoalRiskDetectedPayload } from './domain/events/goal-risk-detected-event.js';

// Aggregate
export { Goal } from './domain/aggregates/goal.js';
export type {
  GoalProps,
  GoalApproveOutcome,
  GoalStartOutcome,
  GoalProgressOutcome,
  GoalCompleteOutcome,
  GoalAbandonOutcome,
  GoalAdjustTargetOutcome,
  GoalExtendDeadlineOutcome,
  GoalAddMilestoneOutcome,
} from './domain/aggregates/goal.js';

// Repository interface
export type { IGoalRepository } from './domain/repositories/i-goal-repository.js';

// ── Application ───────────────────────────────────────────────────────────────

// Ports
export type { IGoalsEventPublisher } from './application/ports/i-goals-event-publisher.js';
export type { IGoalProgressQueryService } from './application/ports/i-goal-progress-query-service.js';

// DTOs
export type {
  CreateGoalInputDTO,
  CreateGoalOutputDTO,
  ApproveGoalInputDTO,
  UpdateGoalProgressInputDTO,
  CompleteGoalInputDTO,
  AbandonGoalInputDTO,
  AdjustGoalTargetInputDTO,
  ExtendGoalDeadlineInputDTO,
  AddMilestoneInputDTO,
  AddMilestoneOutputDTO,
  GetClientGoalsInputDTO,
  GetGoalProgressHistoryInputDTO,
  GoalDTO,
  MilestoneDTO,
  ProgressEntryDTO,
} from './application/dtos/index.js';

// Use Cases
export { CreateGoal } from './application/use-cases/create-goal.js';
export { ApproveGoal } from './application/use-cases/approve-goal.js';
export { UpdateGoalProgress } from './application/use-cases/update-goal-progress.js';
export { CompleteGoal } from './application/use-cases/complete-goal.js';
export { AbandonGoal } from './application/use-cases/abandon-goal.js';
export { AdjustGoalTarget } from './application/use-cases/adjust-goal-target.js';
export { ExtendGoalDeadline } from './application/use-cases/extend-goal-deadline.js';
export { AddMilestone } from './application/use-cases/add-milestone.js';
export { GetClientGoals } from './application/use-cases/get-client-goals.js';
export { GetGoalProgressHistory } from './application/use-cases/get-goal-progress-history.js';

// Event Handlers
export { OnAssessmentCompleted } from './application/event-handlers/on-assessment-completed.js';
export type { AssessmentCompletedForGoalsPayload } from './application/event-handlers/on-assessment-completed.js';
export { OnMetricComputed } from './application/event-handlers/on-metric-computed.js';
export type { MetricComputedForGoalsPayload } from './application/event-handlers/on-metric-computed.js';
export { OnStreakIncremented } from './application/event-handlers/on-streak-incremented.js';
export type { StreakIncrementedForGoalsPayload } from './application/event-handlers/on-streak-incremented.js';
