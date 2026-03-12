import type { IGoalsEventPublisher } from '../../application/ports/i-goals-event-publisher.js';
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

export class InMemoryGoalsEventPublisher implements IGoalsEventPublisher {
  created: GoalCreatedEvent[] = [];
  approved: GoalApprovedEvent[] = [];
  started: GoalStartedEvent[] = [];
  progressUpdated: GoalProgressUpdatedEvent[] = [];
  progressRegressed: GoalProgressRegressedEvent[] = [];
  milestoneReached: GoalMilestoneReachedEvent[] = [];
  targetReached: GoalTargetReachedEvent[] = [];
  offTrack: GoalOffTrackEvent[] = [];
  achieved: GoalAchievedEvent[] = [];
  notAchieved: GoalNotAchievedEvent[] = [];
  abandoned: GoalAbandonedEvent[] = [];
  targetAdjusted: GoalTargetAdjustedEvent[] = [];
  deadlineExtended: GoalDeadlineExtendedEvent[] = [];
  riskDetected: GoalRiskDetectedEvent[] = [];
  milestoneAdded: GoalMilestoneAddedEvent[] = [];

  async publishGoalCreated(e: GoalCreatedEvent) {
    this.created.push(e);
  }
  async publishGoalApproved(e: GoalApprovedEvent) {
    this.approved.push(e);
  }
  async publishGoalStarted(e: GoalStartedEvent) {
    this.started.push(e);
  }
  async publishGoalProgressUpdated(e: GoalProgressUpdatedEvent) {
    this.progressUpdated.push(e);
  }
  async publishGoalProgressRegressed(e: GoalProgressRegressedEvent) {
    this.progressRegressed.push(e);
  }
  async publishGoalMilestoneReached(e: GoalMilestoneReachedEvent) {
    this.milestoneReached.push(e);
  }
  async publishGoalTargetReached(e: GoalTargetReachedEvent) {
    this.targetReached.push(e);
  }
  async publishGoalOffTrack(e: GoalOffTrackEvent) {
    this.offTrack.push(e);
  }
  async publishGoalAchieved(e: GoalAchievedEvent) {
    this.achieved.push(e);
  }
  async publishGoalNotAchieved(e: GoalNotAchievedEvent) {
    this.notAchieved.push(e);
  }
  async publishGoalAbandoned(e: GoalAbandonedEvent) {
    this.abandoned.push(e);
  }
  async publishGoalTargetAdjusted(e: GoalTargetAdjustedEvent) {
    this.targetAdjusted.push(e);
  }
  async publishGoalDeadlineExtended(e: GoalDeadlineExtendedEvent) {
    this.deadlineExtended.push(e);
  }
  async publishGoalRiskDetected(e: GoalRiskDetectedEvent) {
    this.riskDetected.push(e);
  }
  async publishGoalMilestoneAdded(e: GoalMilestoneAddedEvent) {
    this.milestoneAdded.push(e);
  }

  clear() {
    this.created = [];
    this.approved = [];
    this.started = [];
    this.progressUpdated = [];
    this.progressRegressed = [];
    this.milestoneReached = [];
    this.targetReached = [];
    this.offTrack = [];
    this.achieved = [];
    this.notAchieved = [];
    this.abandoned = [];
    this.targetAdjusted = [];
    this.deadlineExtended = [];
    this.riskDetected = [];
    this.milestoneAdded = [];
  }
}
