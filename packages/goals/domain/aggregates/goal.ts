import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProgressPercentage } from '../value-objects/progress-percentage.js';
import { ProgressEntry } from '../entities/progress-entry.js';
import { Milestone } from '../entities/milestone.js';
import { GoalAlreadyApprovedError } from '../errors/goal-already-approved-error.js';
import { GoalAlreadyStartedError } from '../errors/goal-already-started-error.js';
import { GoalAlreadyCompletedError } from '../errors/goal-already-completed-error.js';
import { GoalNotApprovedError } from '../errors/goal-not-approved-error.js';
import { GoalNotActiveError } from '../errors/goal-not-active-error.js';
import { BaselineGreaterThanTargetError } from '../errors/baseline-greater-than-target-error.js';
import { InvalidMilestoneTargetError } from '../errors/invalid-milestone-target-error.js';
import type { GoalCategoryValue } from '../value-objects/goal-category.js';
import type { GoalMetricValue } from '../value-objects/goal-metric.js';
import type { GoalPriorityValue } from '../value-objects/goal-priority.js';
import type { ProgressEntryProps } from '../entities/progress-entry.js';
import type { MilestoneProps } from '../entities/milestone.js';

/** One day in milliseconds. */
const ONE_DAY_MS = 86_400_000;

/** Off-track tolerance margin (percentage points). */
const OFF_TRACK_MARGIN = 10;

export interface GoalProps {
  /** Cross-aggregate reference by ID only (ADR-0047). */
  readonly clientId: string;
  /** Cross-aggregate reference by ID only (ADR-0047). */
  readonly professionalProfileId: string;

  // ── Goal definition ──────────────────────────────────────────────────────
  name: string;
  description: string;
  category: GoalCategoryValue;
  reason: string | null;
  priority: GoalPriorityValue;

  // ── Metric & values ──────────────────────────────────────────────────────
  metricType: GoalMetricValue;
  baselineValue: number;
  targetValue: number;
  unit: string;

  // ── Timeline ─────────────────────────────────────────────────────────────
  /** YYYY-MM-DD target date, optional. */
  targetDate: string | null;

  // ── Progress snapshot (updated on each recordProgress call) ──────────────
  currentValue: number;
  progressPercentage: number;
  lastProgressUpdateAtUtc: UTCDateTime | null;

  // ── Subordinate entities ─────────────────────────────────────────────────
  progressEntries: ProgressEntry[];
  milestones: Milestone[];

  // ── Timestamps (ADR-0022: no status enum — derive state from timestamps) ─
  readonly createdAtUtc: UTCDateTime;
  approvedAtUtc: UTCDateTime | null;
  startedAtUtc: UTCDateTime | null;
  completedAtUtc: UTCDateTime | null;
  abandonedAtUtc: UTCDateTime | null;
  achievedFlag: boolean;

  updatedAtUtc: UTCDateTime;
}

// ── Outcome types (returned by domain methods so the Application layer
//    knows which events to publish — ADR-0009 §4) ──────────────────────────

export type GoalApproveOutcome = { readonly type: 'approved' };

export type GoalStartOutcome = {
  readonly type: 'started';
  readonly baselineValue: number;
  readonly targetValue: number;
  readonly unit: string;
};

export type GoalProgressOutcome = {
  readonly type: 'progress_updated';
  readonly currentValue: number;
  readonly progressPercentage: number;
  readonly source: string;
  readonly regressed: boolean;
  readonly previousValue: number | null;
  readonly milestonesReached: ReadonlyArray<{
    readonly milestoneId: string;
    readonly milestoneName: string;
    readonly reachedValue: number;
  }>;
  readonly targetReached: boolean;
  readonly daysAheadOfSchedule: number;
  readonly offTrack: boolean;
  readonly expectedProgress: number;
};

export type GoalCompleteOutcome =
  | {
      readonly type: 'completed_achieved';
      readonly finalValue: number;
      readonly targetValue: number;
      readonly durationDays: number;
    }
  | {
      readonly type: 'completed_not_achieved';
      readonly finalValue: number;
      readonly targetValue: number;
      readonly gap: number;
    };

export type GoalAbandonOutcome = {
  readonly type: 'abandoned';
  readonly reason: string;
};

export type GoalAdjustTargetOutcome = {
  readonly type: 'target_adjusted';
  readonly oldTarget: number;
  readonly newTarget: number;
  readonly reason: string;
};

export type GoalExtendDeadlineOutcome = {
  readonly type: 'deadline_extended';
  readonly oldDeadline: string | null;
  readonly newDeadline: string;
  readonly reason: string;
};

export type GoalAddMilestoneOutcome = {
  readonly type: 'milestone_added';
  readonly milestoneId: string;
};

/**
 * Goal aggregate root — the stateful source of truth for a client's goal (ADR-0068).
 *
 * ## Lifecycle (ADR-0022 — timestamps, not enums)
 *
 * - DRAFT: approvedAtUtc === null
 * - ACTIVE: approvedAtUtc !== null && startedAtUtc !== null
 *            && completedAtUtc === null && abandonedAtUtc === null
 * - COMPLETED: completedAtUtc !== null (achievedFlag determines result)
 * - ABANDONED: abandonedAtUtc !== null
 *
 * ## Pure state machine (ADR-0009 §3)
 *
 * The aggregate MUST NOT dispatch domain events. The Application layer
 * constructs and publishes events after `repository.save()` (ADR-0009 §4).
 * Domain methods return typed outcome objects so the use case knows
 * exactly which events to emit.
 *
 * ## Data flow (ADR-0068 §2)
 *
 * Execution → Metrics → Goals (Goals never accesses Execution directly).
 */
export class Goal extends AggregateRoot<GoalProps> {
  private constructor(id: string, props: GoalProps, version: number = 0) {
    super(id, props, version);
  }

  // ── Factory methods ───────────────────────────────────────────────────────

  static create(params: {
    id?: string;
    clientId: string;
    professionalProfileId: string;
    name: string;
    description: string;
    category: GoalCategoryValue;
    reason: string | null;
    priority: GoalPriorityValue;
    metricType: GoalMetricValue;
    baselineValue: number;
    targetValue: number;
    unit: string;
    targetDate: string | null;
    createdAtUtc?: UTCDateTime;
  }): DomainResult<Goal> {
    if (params.baselineValue === params.targetValue) {
      return left(new BaselineGreaterThanTargetError());
    }

    const now = params.createdAtUtc ?? UTCDateTime.now();
    const id = params.id ?? generateId();

    return right(
      new Goal(
        id,
        {
          clientId: params.clientId,
          professionalProfileId: params.professionalProfileId,
          name: params.name,
          description: params.description,
          category: params.category,
          reason: params.reason,
          priority: params.priority,
          metricType: params.metricType,
          baselineValue: params.baselineValue,
          targetValue: params.targetValue,
          unit: params.unit,
          targetDate: params.targetDate,
          currentValue: params.baselineValue,
          progressPercentage: 0,
          lastProgressUpdateAtUtc: null,
          progressEntries: [],
          milestones: [],
          createdAtUtc: now,
          approvedAtUtc: null,
          startedAtUtc: null,
          completedAtUtc: null,
          abandonedAtUtc: null,
          achievedFlag: false,
          updatedAtUtc: now,
        },
        0,
      ),
    );
  }

  /** Reconstitutes a Goal from persisted storage. No validation. */
  static reconstitute(
    id: string,
    props: Omit<GoalProps, 'progressEntries' | 'milestones'> & {
      progressEntries: Array<{ id: string; props: ProgressEntryProps }>;
      milestones: Array<{ id: string; props: MilestoneProps }>;
    },
    version: number,
  ): Goal {
    const progressEntries = props.progressEntries.map((e) =>
      ProgressEntry.reconstitute(e.id, e.props),
    );
    const milestones = props.milestones.map((m) => Milestone.reconstitute(m.id, m.props));

    return new Goal(
      id,
      {
        ...props,
        progressEntries,
        milestones,
      },
      version,
    );
  }

  // ── State transitions ─────────────────────────────────────────────────────

  /**
   * Approves a draft goal. Only callable by a professional (validated in use case).
   * Transitions: DRAFT → APPROVED (pending start).
   */
  approve(): DomainResult<GoalApproveOutcome> {
    if (this.props.approvedAtUtc !== null) {
      return left(new GoalAlreadyApprovedError());
    }
    this.props.approvedAtUtc = UTCDateTime.now();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'approved' });
  }

  /**
   * Starts tracking. Sets the progress baseline snapshot.
   * Transitions: APPROVED → ACTIVE.
   */
  start(): DomainResult<GoalStartOutcome> {
    if (this.props.approvedAtUtc === null) {
      return left(new GoalNotApprovedError());
    }
    if (this.props.startedAtUtc !== null) {
      return left(new GoalAlreadyStartedError());
    }
    this.props.startedAtUtc = UTCDateTime.now();
    this.props.currentValue = this.props.baselineValue;
    this.props.progressPercentage = 0;
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({
      type: 'started',
      baselineValue: this.props.baselineValue,
      targetValue: this.props.targetValue,
      unit: this.props.unit,
    });
  }

  /**
   * Records a new progress data point.
   * Returns a rich outcome describing all derived state changes so the
   * Application layer can emit the appropriate events without re-querying.
   */
  recordProgress(entry: ProgressEntry): DomainResult<GoalProgressOutcome> {
    if (!this.isActive()) {
      return left(new GoalNotActiveError());
    }

    const previousValue =
      this.props.progressEntries.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.props.progressEntries[this.props.progressEntries.length - 1]!.value
        : null;

    // Append immutable entry (ADR-0011).
    this.props.progressEntries.push(entry);
    this.props.currentValue = entry.value;
    this.props.lastProgressUpdateAtUtc = UTCDateTime.now();

    // Recompute progress percentage.
    const newPct = ProgressPercentage.compute(
      this.props.baselineValue,
      entry.value,
      this.props.targetValue,
    );
    this.props.progressPercentage = newPct.value;
    this.props.updatedAtUtc = UTCDateTime.now();

    // Detect regression.
    const regressed = previousValue !== null && this._isRegression(previousValue, entry.value);

    // Check milestones.
    const milestonesReached: Array<{
      milestoneId: string;
      milestoneName: string;
      reachedValue: number;
    }> = [];

    for (const milestone of this.props.milestones) {
      if (!milestone.isReached() && this._milestoneReached(milestone.targetValue, entry.value)) {
        milestone.markReached();
        milestonesReached.push({
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          reachedValue: entry.value,
        });
      }
    }

    // Check if target reached.
    const targetReached = this._hasReachedTarget(entry.value);
    const daysAheadOfSchedule = targetReached ? Math.max(0, this.daysRemaining() ?? 0) : 0;

    // Check if off track (only when targetDate is set and enough time elapsed).
    const { offTrack, expectedProgress } = this._computeOffTrackStatus();

    return right({
      type: 'progress_updated',
      currentValue: entry.value,
      progressPercentage: newPct.value,
      source: entry.source,
      regressed,
      previousValue,
      milestonesReached,
      targetReached,
      daysAheadOfSchedule,
      offTrack,
      expectedProgress,
    });
  }

  /**
   * Marks the goal as completed.
   * `achieved` = true if the client reached the target value.
   * Transitions: ACTIVE → COMPLETED.
   */
  complete(achieved: boolean): DomainResult<GoalCompleteOutcome> {
    if (this.isCompleted()) {
      return left(new GoalAlreadyCompletedError());
    }
    if (!this.isActive()) {
      return left(new GoalNotActiveError());
    }
    this.props.completedAtUtc = UTCDateTime.now();
    this.props.achievedFlag = achieved;
    this.props.updatedAtUtc = UTCDateTime.now();

    // startedAtUtc is guaranteed non-null here because isActive() already verified it
    const durationDays = Math.floor(
      (this.props.completedAtUtc.value.getTime() -
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.props.startedAtUtc!.value.getTime()) /
        ONE_DAY_MS,
    );

    if (achieved) {
      return right({
        type: 'completed_achieved',
        finalValue: this.props.currentValue,
        targetValue: this.props.targetValue,
        durationDays,
      });
    }

    return right({
      type: 'completed_not_achieved',
      finalValue: this.props.currentValue,
      targetValue: this.props.targetValue,
      gap: Math.abs(this.props.targetValue - this.props.currentValue),
    });
  }

  /**
   * Abandons the goal. Both client and professional can abandon.
   * Transitions: ACTIVE or DRAFT → ABANDONED.
   */
  abandon(reason: string): DomainResult<GoalAbandonOutcome> {
    if (this.isCompleted() || this.isAbandoned()) {
      return left(new GoalNotActiveError());
    }
    this.props.abandonedAtUtc = UTCDateTime.now();
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'abandoned', reason });
  }

  /**
   * Adjusts the numeric target value. Only callable by a professional.
   * Recalculates progress percentage after adjustment.
   */
  adjustTarget(newTargetValue: number, reason: string): DomainResult<GoalAdjustTargetOutcome> {
    if (!this.isActive()) {
      return left(new GoalNotActiveError());
    }
    const oldTarget = this.props.targetValue;
    this.props.targetValue = newTargetValue;

    // Recalculate progress with new target.
    const newPct = ProgressPercentage.compute(
      this.props.baselineValue,
      this.props.currentValue,
      newTargetValue,
    );
    this.props.progressPercentage = newPct.value;
    this.props.updatedAtUtc = UTCDateTime.now();

    return right({ type: 'target_adjusted', oldTarget, newTarget: newTargetValue, reason });
  }

  /**
   * Extends the target date. The new date must be after the current one.
   */
  extendDeadline(newDeadline: string, reason: string): DomainResult<GoalExtendDeadlineOutcome> {
    if (!this.isActive()) {
      return left(new GoalNotActiveError());
    }
    const oldDeadline = this.props.targetDate;
    this.props.targetDate = newDeadline;
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'deadline_extended', oldDeadline, newDeadline, reason });
  }

  /**
   * Adds an optional milestone to the goal.
   * Milestone targetValue must be between baseline and target.
   */
  addMilestone(milestone: Milestone): DomainResult<GoalAddMilestoneOutcome> {
    // Validate milestone target is between baseline and target.
    const isDecreasing = this.props.targetValue < this.props.baselineValue;
    const isValidPosition = isDecreasing
      ? milestone.targetValue < this.props.baselineValue &&
        milestone.targetValue > this.props.targetValue
      : milestone.targetValue > this.props.baselineValue &&
        milestone.targetValue < this.props.targetValue;

    if (!isValidPosition) {
      return left(
        new InvalidMilestoneTargetError(
          `Milestone target must be between baseline (${this.props.baselineValue}) and target (${this.props.targetValue}).`,
        ),
      );
    }

    this.props.milestones.push(milestone);
    // Keep milestones sorted by order.
    this.props.milestones.sort((a, b) => a.order - b.order);
    this.props.updatedAtUtc = UTCDateTime.now();

    return right({ type: 'milestone_added', milestoneId: milestone.id });
  }

  // ── State query helpers ───────────────────────────────────────────────────

  /** True when the goal has not yet been approved (DRAFT). */
  isDraft(): boolean {
    return this.props.approvedAtUtc === null;
  }

  /** True when approved, started, and not yet completed or abandoned. */
  isActive(): boolean {
    return (
      this.props.approvedAtUtc !== null &&
      this.props.startedAtUtc !== null &&
      this.props.completedAtUtc === null &&
      this.props.abandonedAtUtc === null
    );
  }

  isCompleted(): boolean {
    return this.props.completedAtUtc !== null;
  }

  isAbandoned(): boolean {
    return this.props.abandonedAtUtc !== null;
  }

  isAchieved(): boolean {
    return this.props.completedAtUtc !== null && this.props.achievedFlag;
  }

  hasReachedTarget(): boolean {
    return this._hasReachedTarget(this.props.currentValue);
  }

  /**
   * True when actual progress >= expected progress (within OFF_TRACK_MARGIN).
   * Returns true when there is no targetDate or goal hasn't started.
   */
  isOnTrack(): boolean {
    const { offTrack } = this._computeOffTrackStatus();
    return !offTrack;
  }

  daysRemaining(): number | null {
    if (!this.props.targetDate) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetMs = new Date(this.props.targetDate + 'T00:00:00Z').getTime();
    const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
    return Math.ceil((targetMs - todayMs) / ONE_DAY_MS);
  }

  getLatestProgress(): ProgressEntry | null {
    if (this.props.progressEntries.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.props.progressEntries[this.props.progressEntries.length - 1]!;
  }

  getMilestoneProgress(): { reached: number; total: number } {
    const total = this.props.milestones.length;
    const reached = this.props.milestones.filter((m) => m.isReached()).length;
    return { reached, total };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _isDecreasingGoal(): boolean {
    return this.props.targetValue < this.props.baselineValue;
  }

  private _isRegression(previousValue: number, currentValue: number): boolean {
    if (this._isDecreasingGoal()) {
      // Decreasing goal: regression = current went UP
      return currentValue > previousValue;
    }
    // Increasing goal: regression = current went DOWN
    return currentValue < previousValue;
  }

  private _hasReachedTarget(currentValue: number): boolean {
    if (this._isDecreasingGoal()) {
      return currentValue <= this.props.targetValue;
    }
    return currentValue >= this.props.targetValue;
  }

  private _milestoneReached(milestoneTarget: number, currentValue: number): boolean {
    if (this._isDecreasingGoal()) {
      return currentValue <= milestoneTarget;
    }
    return currentValue >= milestoneTarget;
  }

  private _computeOffTrackStatus(): { offTrack: boolean; expectedProgress: number } {
    if (!this.props.targetDate || !this.props.startedAtUtc) {
      return { offTrack: false, expectedProgress: 0 };
    }

    const startStr = this.props.startedAtUtc.value.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    const startMs = new Date(startStr + 'T00:00:00Z').getTime();
    const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
    const targetMs = new Date(this.props.targetDate + 'T00:00:00Z').getTime();

    const totalDays = (targetMs - startMs) / ONE_DAY_MS;
    if (totalDays <= 0) return { offTrack: false, expectedProgress: 0 };

    const elapsedDays = (todayMs - startMs) / ONE_DAY_MS;
    const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
    const offTrack = this.props.progressPercentage < expectedProgress - OFF_TRACK_MARGIN;

    return { offTrack, expectedProgress };
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get clientId(): string {
    return this.props.clientId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): GoalCategoryValue {
    return this.props.category;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  get priority(): GoalPriorityValue {
    return this.props.priority;
  }

  get metricType(): GoalMetricValue {
    return this.props.metricType;
  }

  get baselineValue(): number {
    return this.props.baselineValue;
  }

  get targetValue(): number {
    return this.props.targetValue;
  }

  get unit(): string {
    return this.props.unit;
  }

  get targetDate(): string | null {
    return this.props.targetDate;
  }

  get currentValue(): number {
    return this.props.currentValue;
  }

  get progressPercentage(): number {
    return this.props.progressPercentage;
  }

  get progressEntries(): ReadonlyArray<ProgressEntry> {
    return this.props.progressEntries;
  }

  get milestones(): ReadonlyArray<Milestone> {
    return this.props.milestones;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get approvedAtUtc(): UTCDateTime | null {
    return this.props.approvedAtUtc;
  }

  get startedAtUtc(): UTCDateTime | null {
    return this.props.startedAtUtc;
  }

  get completedAtUtc(): UTCDateTime | null {
    return this.props.completedAtUtc;
  }

  get abandonedAtUtc(): UTCDateTime | null {
    return this.props.abandonedAtUtc;
  }

  get achievedFlag(): boolean {
    return this.props.achievedFlag;
  }

  get updatedAtUtc(): UTCDateTime {
    return this.props.updatedAtUtc;
  }
}
