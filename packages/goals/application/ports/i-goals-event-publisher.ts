import type { GoalCreatedEvent } from '../../domain/events/goal-created-event.js';
import type { GoalApprovedEvent } from '../../domain/events/goal-approved-event.js';
import type { GoalStartedEvent } from '../../domain/events/goal-started-event.js';
import type { GoalProgressUpdatedEvent } from '../../domain/events/goal-progress-updated-event.js';
import type { GoalProgressRegressedEvent } from '../../domain/events/goal-progress-regressed-event.js';
import type { GoalMilestoneReachedEvent } from '../../domain/events/goal-milestone-reached-event.js';
import type { GoalTargetReachedEvent } from '../../domain/events/goal-target-reached-event.js';
import type { GoalOffTrackEvent } from '../../domain/events/goal-off-track-event.js';
import type { GoalAchievedEvent } from '../../domain/events/goal-achieved-event.js';
import type { GoalNotAchievedEvent } from '../../domain/events/goal-not-achieved-event.js';
import type { GoalAbandonedEvent } from '../../domain/events/goal-abandoned-event.js';
import type { GoalTargetAdjustedEvent } from '../../domain/events/goal-target-adjusted-event.js';
import type { GoalDeadlineExtendedEvent } from '../../domain/events/goal-deadline-extended-event.js';
import type { GoalRiskDetectedEvent } from '../../domain/events/goal-risk-detected-event.js';
import type { GoalMilestoneAddedEvent } from '../../domain/events/goal-milestone-added-event.js';

/**
 * Port for publishing Goal domain events to the event bus.
 * Implementation lives in the infrastructure layer.
 */
export interface IGoalsEventPublisher {
  publishGoalCreated(event: GoalCreatedEvent): Promise<void>;
  publishGoalApproved(event: GoalApprovedEvent): Promise<void>;
  publishGoalStarted(event: GoalStartedEvent): Promise<void>;
  publishGoalProgressUpdated(event: GoalProgressUpdatedEvent): Promise<void>;
  publishGoalProgressRegressed(event: GoalProgressRegressedEvent): Promise<void>;
  publishGoalMilestoneReached(event: GoalMilestoneReachedEvent): Promise<void>;
  publishGoalTargetReached(event: GoalTargetReachedEvent): Promise<void>;
  publishGoalOffTrack(event: GoalOffTrackEvent): Promise<void>;
  publishGoalAchieved(event: GoalAchievedEvent): Promise<void>;
  publishGoalNotAchieved(event: GoalNotAchievedEvent): Promise<void>;
  publishGoalAbandoned(event: GoalAbandonedEvent): Promise<void>;
  publishGoalTargetAdjusted(event: GoalTargetAdjustedEvent): Promise<void>;
  publishGoalDeadlineExtended(event: GoalDeadlineExtendedEvent): Promise<void>;
  publishGoalRiskDetected(event: GoalRiskDetectedEvent): Promise<void>;
  publishGoalMilestoneAdded(event: GoalMilestoneAddedEvent): Promise<void>;
}
