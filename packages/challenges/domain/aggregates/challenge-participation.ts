import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProgressCannotDecreaseError } from '../errors/progress-cannot-decrease-error.js';

export interface ChallengeParticipationProps {
  challengeId: string;
  userId: string;
  currentProgress: number;
  progressPercentage: number; // 0-100
  readonly joinedAtUtc: Date;
  completedAtUtc: Date | null;
  lastProgressUpdateAtUtc: Date;
  readonly createdAtUtc: UTCDateTime;
  updatedAtUtc: UTCDateTime;
}

export type UpdateProgressOutcome =
  | { type: 'no_change' }
  | { type: 'updated'; completedGoal: false }
  | { type: 'updated'; completedGoal: true; completedAtUtc: Date };

/**
 * ChallengeParticipation aggregate root — tracks a single user's progress
 * within a challenge.
 *
 * ## Pure state machine
 *
 * The aggregate MUST NOT dispatch domain events. The Application layer
 * constructs and publishes events after `repository.save()`.
 *
 * @see ADR-0009 — aggregate purity: no event collection or side effects
 * @see ADR-0003 — one aggregate per transaction; Challenge and
 *   ChallengeParticipation are separate aggregates referenced by ID only
 *
 * ## Progress invariant
 *
 * Progress never decreases. Any attempt to set a lower value returns
 * `ProgressCannotDecreaseError` (left). This guarantees monotonic progress
 * and makes `updateProgress()` safe to call multiple times with the same value.
 *
 * ## Late-join fairness
 *
 * `joinedAtUtc` is recorded at creation and is immutable. Event handlers that
 * query cumulative metrics (e.g. total workout count) must scope the query to
 * `sinceUtc = joinedAtUtc` so that pre-join activity does not count toward
 * the participant's goal.
 */
export class ChallengeParticipation extends AggregateRoot<ChallengeParticipationProps> {
  private constructor(id: string, props: ChallengeParticipationProps, version = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    challengeId: string;
    userId: string;
    joinedAtUtc: Date;
    createdAtUtc: UTCDateTime;
    updatedAtUtc: UTCDateTime;
  }): DomainResult<ChallengeParticipation> {
    const id = props.id ?? generateId();
    return right(
      new ChallengeParticipation(
        id,
        {
          challengeId: props.challengeId,
          userId: props.userId,
          currentProgress: 0,
          progressPercentage: 0,
          joinedAtUtc: props.joinedAtUtc,
          completedAtUtc: null,
          lastProgressUpdateAtUtc: props.joinedAtUtc,
          createdAtUtc: props.createdAtUtc,
          updatedAtUtc: props.updatedAtUtc,
        },
        0,
      ),
    );
  }

  static reconstitute(
    id: string,
    props: ChallengeParticipationProps,
    version: number,
  ): ChallengeParticipation {
    return new ChallengeParticipation(id, props, version);
  }

  // ── State transitions ──────────────────────────────────────────────────────

  updateProgress(
    newProgress: number,
    goalTargetValue: number,
  ): DomainResult<UpdateProgressOutcome> {
    if (newProgress < this.props.currentProgress) {
      return left(new ProgressCannotDecreaseError());
    }

    // Same-value update is a no-op when goalTargetValue > 0: the absolute progress
    // did not change (e.g. at-least-once redelivery of the same event).
    // The 'no_change' outcome signals the use case to skip the save and event publish.
    // Exception: when goalTargetValue === 0 we still proceed so that progressPercentage
    // is correctly set to 100 on the first update call.
    if (newProgress === this.props.currentProgress && goalTargetValue > 0) {
      return right({ type: 'no_change' });
    }

    const now = new Date();

    this.props.currentProgress = newProgress;
    this.props.progressPercentage =
      goalTargetValue > 0 ? Math.min(100, Math.round((newProgress / goalTargetValue) * 100)) : 100;
    this.props.lastProgressUpdateAtUtc = now;
    this.props.updatedAtUtc = UTCDateTime.now();

    if (this.hasReachedGoal(goalTargetValue) && !this.hasCompleted()) {
      this.props.completedAtUtc = now;
      return right({ type: 'updated', completedGoal: true, completedAtUtc: now });
    }

    return right({ type: 'updated', completedGoal: false });
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  hasCompleted(): boolean {
    return this.props.completedAtUtc !== null;
  }

  hasReachedGoal(target: number): boolean {
    return this.props.currentProgress >= target;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get challengeId(): string {
    return this.props.challengeId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get currentProgress(): number {
    return this.props.currentProgress;
  }

  get progressPercentage(): number {
    return this.props.progressPercentage;
  }

  get joinedAtUtc(): Date {
    return this.props.joinedAtUtc;
  }

  get completedAtUtc(): Date | null {
    return this.props.completedAtUtc;
  }

  get lastProgressUpdateAtUtc(): Date {
    return this.props.lastProgressUpdateAtUtc;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get updatedAtUtc(): UTCDateTime {
    return this.props.updatedAtUtc;
  }
}
