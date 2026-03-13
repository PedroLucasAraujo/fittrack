import { AggregateRoot, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { EngagementScore } from '../value-objects/EngagementScore.js';
import type { EngagementLevel } from '../value-objects/EngagementLevel.js';
import type { EngagementTrend } from '../value-objects/EngagementTrend.js';
import type { TrendPercentage } from '../value-objects/TrendPercentage.js';
import type { DaysInactive } from '../value-objects/DaysInactive.js';
import { EngagementLevel as EngagementLevelVO } from '../value-objects/EngagementLevel.js';
import { EngagementTrend as EngagementTrendVO } from '../value-objects/EngagementTrend.js';
import { TrendPercentage as TrendPercentageVO } from '../value-objects/TrendPercentage.js';
import { DaysInactive as DaysInactiveVO } from '../value-objects/DaysInactive.js';
import { EngagementScore as EngagementScoreVO } from '../value-objects/EngagementScore.js';
import type { EngagementHistory } from '../entities/EngagementHistory.js';
import { EngagementHistory as EngagementHistoryEntity } from '../entities/EngagementHistory.js';
import { InvalidEngagementError } from '../errors/InvalidEngagementError.js';

/** Maximum weekly history snapshots retained per user (≈ 3 months). */
const MAX_HISTORY_ENTRIES = 12;

/** Improvement threshold (%) to trigger EngagementImprovedEvent. */
const IMPROVEMENT_THRESHOLD_PCT = 20;

/** Minimum previous streak (days) to trigger churn risk on streak break. */
const LONG_STREAK_THRESHOLD = 30;

/**
 * Input for UserEngagement.updateScores().
 * All values are provided by CalculateUserEngagementUseCase via ACL queries.
 */
export interface UpdateScoresInput {
  workoutScore: EngagementScore;
  habitScore: EngagementScore;
  goalProgressScore: EngagementScore;
  streakScore: EngagementScore;
  workoutsCompleted: number;
  nutritionLogsCreated: number;
  bookingsAttended: number;
  currentStreak: number;
  activeGoalsCount: number;
  goalsOnTrackCount: number;
  windowStartDate: string;
  windowEndDate: string;
  calculatedAtUtc: string;
  daysInactive: DaysInactive;
  lastActivityDate: string | null;
  /** Score from the previous week (for trend calculation). Null if first calculation. */
  previousWeekScore: number | null;
}

/**
 * Outcome returned by UserEngagement.updateScores().
 *
 * The Application layer (UseCase) uses the outcome flags to decide which
 * domain events to publish (ADR-0047 §3 — UseCase is sole event dispatcher).
 */
export interface UpdateScoresOutcome {
  overallScore: number;
  engagementLevel: string;
  trend: string;
  trendPercentage: number | null;
  churnRiskDetected: boolean;
  churnRiskResolved: boolean;
  engagementImproved: boolean;
  improvementPercentage: number | null;
  previousScore: number | null;
  daysInactive: number;
  lastActivityDate: string | null;
}

export interface UserEngagementProps {
  /**
   * Client whose engagement is tracked.
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  userId: string;

  /**
   * Owning professional — tenant isolation key (ADR-0025).
   * Cross-aggregate reference: ID only (ADR-0047).
   */
  professionalProfileId: string;

  /** Workout frequency score (0–100). */
  workoutScore: EngagementScore;

  /** Nutrition habit consistency score (0–100). */
  habitScore: EngagementScore;

  /** Goal progress score (0–100). */
  goalProgressScore: EngagementScore;

  /** Streak score (0–100). */
  streakScore: EngagementScore;

  /** Weighted overall score (0–100). */
  overallScore: EngagementScore;

  /** Derived level from overallScore. */
  engagementLevel: EngagementLevel;

  /** Week-over-week trend. */
  trend: EngagementTrend;

  /** Week-over-week change percentage. Null on first calculation. */
  trendPercentage: TrendPercentage | null;

  /** Raw count of workouts completed in the last 7 days. */
  workoutsCompleted: number;

  /** Raw count of nutrition log entries in the last 7 days. */
  nutritionLogsCreated: number;

  /** Raw count of bookings attended (COMPLETED) in the last 7 days. */
  bookingsAttended: number;

  /** Current consecutive active days from Gamification module. */
  currentStreak: number;

  /** Total active goals. */
  activeGoalsCount: number;

  /** Goals currently on track. */
  goalsOnTrackCount: number;

  /** UTC ISO 8601 of the last score calculation. */
  calculatedAtUtc: string;

  /** Start of the 7-day calculation window (YYYY-MM-DD). */
  windowStartDate: string;

  /** End of the 7-day calculation window (YYYY-MM-DD). */
  windowEndDate: string;

  /**
   * True when the user meets churn risk criteria.
   * Uses timestamp (riskDetectedAtUtc) instead of enum status (ADR-0022).
   */
  isAtRisk: boolean;

  /** UTC ISO 8601 when churn risk was first detected. Null if not at risk. */
  riskDetectedAtUtc: string | null;

  /** Days since last recorded activity. Null if never inactive. */
  daysInactive: DaysInactive | null;

  /** Date of most recent activity (any type). Null if never active. */
  lastActivityDate: string | null;

  /** Rolling weekly snapshots (last MAX_HISTORY_ENTRIES weeks). Immutable entries. */
  history: EngagementHistory[];
}

/**
 * UserEngagement aggregate root — multi-dimensional engagement snapshot per user.
 *
 * ## Analytical bounded context (ADR-0058)
 * Engagement is a mutable, recalculable analytical context. It is NOT
 * event-sourced: the daily job can wipe and recalculate without data loss.
 *
 * ## Score dimensions
 * - workoutScore (40%): exercise frequency vs. weekly target
 * - habitScore (25%): nutrition log consistency
 * - goalProgressScore (20%): % active goals on track
 * - streakScore (15%): consecutive active days vs. 30-day target
 *
 * ## Churn risk detection
 * Rule 1: VERY_LOW level AND 7+ days inactive AND DECLINING trend.
 * Rule 2: streak just broke AND previous streak was ≥ 30 days.
 *
 * ## Event dispatching (ADR-0047)
 * Aggregates are pure state machines. `updateScores()` returns an
 * `UpdateScoresOutcome` — the UseCase reads the outcome flags and publishes
 * the appropriate domain events post-commit. NO `addDomainEvent()` calls here.
 *
 * ## Cross-aggregate references (ADR-0047)
 * `userId` and `professionalProfileId` are string IDs only.
 */
export class UserEngagement extends AggregateRoot<UserEngagementProps> {
  private constructor(id: string, props: UserEngagementProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new UserEngagement aggregate with default zero scores.
   * All pre-conditions (valid IDs) must be checked by the Application layer.
   */
  static create(params: {
    id?: string;
    userId: string;
    professionalProfileId: string;
  }): DomainResult<UserEngagement> {
    if (!params.userId || params.userId.trim().length === 0) {
      return left(new InvalidEngagementError('userId is required'));
    }
    if (!params.professionalProfileId || params.professionalProfileId.trim().length === 0) {
      return left(new InvalidEngagementError('professionalProfileId is required'));
    }

    const zeroScore = EngagementScoreVO.create(0).value as EngagementScore;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const id = params.id ?? generateId();
    return right(
      new UserEngagement(
        id,
        {
          userId: params.userId,
          professionalProfileId: params.professionalProfileId,
          workoutScore: zeroScore,
          habitScore: zeroScore,
          goalProgressScore: zeroScore,
          streakScore: zeroScore,
          overallScore: zeroScore,
          engagementLevel: EngagementLevelVO.fromScore(zeroScore),
          trend: EngagementTrendVO.fromDelta(0),
          trendPercentage: null,
          workoutsCompleted: 0,
          nutritionLogsCreated: 0,
          bookingsAttended: 0,
          currentStreak: 0,
          activeGoalsCount: 0,
          goalsOnTrackCount: 0,
          calculatedAtUtc: now,
          windowStartDate: today,
          windowEndDate: today,
          isAtRisk: false,
          riskDetectedAtUtc: null,
          daysInactive: null,
          lastActivityDate: null,
          history: [],
        },
        0,
      ),
    );
  }

  /** Reconstitutes from persistence without re-validation. */
  static reconstitute(id: string, props: UserEngagementProps, version: number): UserEngagement {
    return new UserEngagement(id, props, version);
  }

  // ── Core domain operation ──────────────────────────────────────────────────

  /**
   * Updates all engagement scores and computes derived state.
   *
   * Called by `CalculateUserEngagementUseCase` with pre-calculated score VOs.
   * Returns `UpdateScoresOutcome` — the UseCase uses these flags to decide
   * which events to publish (ADR-0047).
   *
   * Side effects (pure state mutation):
   * 1. Updates all score fields.
   * 2. Recalculates overallScore and engagementLevel.
   * 3. Computes week-over-week trend.
   * 4. Detects / resolves churn risk.
   * 5. Updates raw metrics and window metadata.
   */
  updateScores(input: UpdateScoresInput): DomainResult<UpdateScoresOutcome> {
    const { workoutScore, habitScore, goalProgressScore, streakScore } = input;

    // 1. Compute weighted overall score
    const overallScore = EngagementScoreVO.fromWeighted(
      workoutScore,
      habitScore,
      goalProgressScore,
      streakScore,
    );

    // 2. Derive engagement level
    const engagementLevel = EngagementLevelVO.fromScore(overallScore);

    // 3. Compute trend
    const previousScore = input.previousWeekScore;
    let trend = this.props.trend;
    let trendPercentage: TrendPercentage | null = this.props.trendPercentage;

    if (previousScore !== null) {
      const delta = overallScore.value - previousScore;
      trend = EngagementTrendVO.fromDelta(delta);
      trendPercentage = TrendPercentageVO.calculate(overallScore.value, previousScore);
    }

    // 4. Detect churn risk
    const prevIsAtRisk = this.props.isAtRisk;
    const previousStreakFromHistory = this.getLastHistoryStreak();

    const nowAtRisk = this.computeChurnRisk(
      engagementLevel,
      input.daysInactive,
      trend,
      input.currentStreak,
      previousStreakFromHistory,
    );

    const churnRiskDetected = nowAtRisk && !prevIsAtRisk;
    const churnRiskResolved = !nowAtRisk && prevIsAtRisk;

    // 5. Determine if engagement improved significantly
    let engagementImproved = false;
    let improvementPercentage: number | null = null;

    if (previousScore !== null && previousScore > 0) {
      const pct = ((overallScore.value - previousScore) / previousScore) * 100;
      if (pct >= IMPROVEMENT_THRESHOLD_PCT) {
        engagementImproved = true;
        improvementPercentage = Math.round(pct);
      }
    }

    // 6. Mutate state
    this.props.workoutScore = workoutScore;
    this.props.habitScore = habitScore;
    this.props.goalProgressScore = goalProgressScore;
    this.props.streakScore = streakScore;
    this.props.overallScore = overallScore;
    this.props.engagementLevel = engagementLevel;
    this.props.trend = trend;
    this.props.trendPercentage = trendPercentage;

    this.props.workoutsCompleted = input.workoutsCompleted;
    this.props.nutritionLogsCreated = input.nutritionLogsCreated;
    this.props.bookingsAttended = input.bookingsAttended;
    this.props.currentStreak = input.currentStreak;
    this.props.activeGoalsCount = input.activeGoalsCount;
    this.props.goalsOnTrackCount = input.goalsOnTrackCount;
    this.props.calculatedAtUtc = input.calculatedAtUtc;
    this.props.windowStartDate = input.windowStartDate;
    this.props.windowEndDate = input.windowEndDate;
    this.props.daysInactive = input.daysInactive;
    this.props.lastActivityDate = input.lastActivityDate;

    if (churnRiskDetected) {
      this.props.isAtRisk = true;
      this.props.riskDetectedAtUtc = input.calculatedAtUtc;
    } else if (churnRiskResolved) {
      this.props.isAtRisk = false;
      this.props.riskDetectedAtUtc = null;
    }

    return right({
      overallScore: overallScore.value,
      engagementLevel: engagementLevel.value,
      trend: trend.value,
      trendPercentage: trendPercentage?.value ?? null,
      churnRiskDetected,
      churnRiskResolved,
      engagementImproved,
      improvementPercentage,
      previousScore,
      daysInactive: input.daysInactive.value,
      lastActivityDate: input.lastActivityDate,
    });
  }

  /**
   * Appends a weekly snapshot to the history.
   * Maintains a rolling window of MAX_HISTORY_ENTRIES entries.
   * Must be called AFTER updateScores() to snapshot the new state.
   */
  addHistorySnapshot(): DomainResult<void> {
    const snapshotResult = EngagementHistoryEntity.create({
      userId: this.props.userId,
      weekStartDate: this.props.windowStartDate,
      weekEndDate: this.props.windowEndDate,
      overallScore: this.props.overallScore.value,
      workoutScore: this.props.workoutScore.value,
      habitScore: this.props.habitScore.value,
      goalProgressScore: this.props.goalProgressScore.value,
      streakScore: this.props.streakScore.value,
      engagementLevel: this.props.engagementLevel.value,
      workoutsCompleted: this.props.workoutsCompleted,
      nutritionLogsCreated: this.props.nutritionLogsCreated,
      bookingsAttended: this.props.bookingsAttended,
      currentStreak: this.props.currentStreak,
      createdAtUtc: this.props.calculatedAtUtc,
    });

    /* v8 ignore next */
    if (snapshotResult.isLeft()) return snapshotResult;

    this.props.history.push(snapshotResult.value);

    // Rolling window: keep only last MAX_HISTORY_ENTRIES
    if (this.props.history.length > MAX_HISTORY_ENTRIES) {
      this.props.history.shift();
    }

    return right(undefined);
  }

  // ── Query helpers (ADR-0022: methods instead of status enum) ──────────────

  /** True when the user had activity within the last 7 days. */
  isActive(): boolean {
    if (!this.props.lastActivityDate) return false;
    const last = new Date(this.props.lastActivityDate);
    const diffMs = Date.now() - last.getTime();
    return diffMs <= 7 * 24 * 60 * 60 * 1000;
  }

  /** True when this aggregate is currently flagged as churn risk. */
  isAtChurnRisk(): boolean {
    return this.props.isAtRisk;
  }

  /** True when the week-over-week trend is IMPROVING. */
  hasImproved(): boolean {
    return this.props.trend.value === 'IMPROVING';
  }

  /** True when the week-over-week trend is DECLINING. */
  hasDeclined(): boolean {
    return this.props.trend.value === 'DECLINING';
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private computeChurnRisk(
    level: EngagementLevel,
    daysInactive: DaysInactive,
    trend: EngagementTrend,
    currentStreak: number,
    previousStreak: number,
  ): boolean {
    // Rule 1: Very low engagement + sustained inactivity + declining
    if (level.value === 'VERY_LOW' && daysInactive.isChurnRisk() && trend.isDeclining()) {
      return true;
    }
    // Rule 2: Streak just broke + user had a long streak (engagement habit lost)
    if (currentStreak === 0 && previousStreak >= LONG_STREAK_THRESHOLD) {
      return true;
    }
    return false;
  }

  /** Returns the streak from the most recent history entry, or 0 if no history. */
  private getLastHistoryStreak(): number {
    if (this.props.history.length === 0) return 0;
    return this.props.history[this.props.history.length - 1].currentStreak;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get userId(): string {
    return this.props.userId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get workoutScore(): EngagementScore {
    return this.props.workoutScore;
  }

  get habitScore(): EngagementScore {
    return this.props.habitScore;
  }

  get goalProgressScore(): EngagementScore {
    return this.props.goalProgressScore;
  }

  get streakScore(): EngagementScore {
    return this.props.streakScore;
  }

  get overallScore(): EngagementScore {
    return this.props.overallScore;
  }

  get engagementLevel(): EngagementLevel {
    return this.props.engagementLevel;
  }

  get trend(): EngagementTrend {
    return this.props.trend;
  }

  get trendPercentage(): TrendPercentage | null {
    return this.props.trendPercentage;
  }

  get workoutsCompleted(): number {
    return this.props.workoutsCompleted;
  }

  get nutritionLogsCreated(): number {
    return this.props.nutritionLogsCreated;
  }

  get bookingsAttended(): number {
    return this.props.bookingsAttended;
  }

  get currentStreak(): number {
    return this.props.currentStreak;
  }

  get activeGoalsCount(): number {
    return this.props.activeGoalsCount;
  }

  get goalsOnTrackCount(): number {
    return this.props.goalsOnTrackCount;
  }

  get calculatedAtUtc(): string {
    return this.props.calculatedAtUtc;
  }

  get windowStartDate(): string {
    return this.props.windowStartDate;
  }

  get windowEndDate(): string {
    return this.props.windowEndDate;
  }

  get isAtRisk(): boolean {
    return this.props.isAtRisk;
  }

  get riskDetectedAtUtc(): string | null {
    return this.props.riskDetectedAtUtc;
  }

  get daysInactive(): DaysInactive | null {
    return this.props.daysInactive;
  }

  get lastActivityDate(): string | null {
    return this.props.lastActivityDate;
  }

  get history(): ReadonlyArray<EngagementHistory> {
    return [...this.props.history];
  }
}
