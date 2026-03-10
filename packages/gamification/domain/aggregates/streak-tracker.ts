import { AggregateRoot, UTCDateTime, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ActivityDay } from '../value-objects/activity-day.js';
import { NoFreezeTokensAvailableError } from '../errors/no-freeze-tokens-available-error.js';
import { StreakNotAtRiskError } from '../errors/streak-not-at-risk-error.js';

/** One day in milliseconds. */
const ONE_DAY_MS = 86_400_000;

/** Guard against runaway streak values. */
const MAX_STREAK_VALUE = 10_000;

/**
 * Maximum freeze tokens a user may hold simultaneously.
 * Capped at 2 to prevent hoarding. Earned every 7 consecutive streak days.
 */
export const MAX_FREEZE_TOKENS = 2;

export interface StreakTrackerProps {
  /**
   * The user whose streak this tracks.
   * Cross-aggregate reference by ID only (ADR-0047).
   * Gamification is user-scoped, not tenant-scoped.
   */
  userId: string;

  /** Number of consecutive active days ending at lastActivityDay. 0 = broken or never started. */
  currentStreak: number;

  /** All-time personal record for consecutive days. Never decreases. */
  longestStreak: number;

  /**
   * YYYY-MM-DD UTC of the last recorded activity day.
   * null means no activity has ever been recorded.
   */
  lastActivityDay: string | null;

  /**
   * YYYY-MM-DD UTC of the first day of the current streak run.
   * null when currentStreak = 0.
   */
  streakStartDay: string | null;

  /** Available freeze tokens (0–MAX_FREEZE_TOKENS). Earned every 7 streak days, max 2. */
  freezeTokenCount: number;

  /** Cumulative freeze tokens earned since account creation (for analytics/anti-fraud). */
  freezeTokensEarnedTotal: number;

  /** Cumulative freeze tokens spent since account creation (for analytics/anti-fraud). */
  freezeTokensUsedTotal: number;

  readonly createdAtUtc: UTCDateTime;
  updatedAtUtc: UTCDateTime;
}

/**
 * Discriminated union returned by `recordActivity()` so the Application layer
 * knows exactly which domain events to publish (ADR-0009 §4).
 */
export type ActivityRecordOutcome =
  | { readonly type: 'noop' }
  | {
      readonly type: 'started';
      readonly earnedFreezeToken: false;
    }
  | {
      readonly type: 'incremented';
      readonly newCurrentStreak: number;
      readonly earnedFreezeToken: boolean;
      readonly isNewRecord: boolean;
    }
  | {
      readonly type: 'restarted';
      readonly previousStreak: number;
      readonly earnedFreezeToken: false;
    };

/**
 * StreakTracker aggregate root — the stateful gamification source of truth for
 * a user's streak and freeze tokens (ADR-0066).
 *
 * ## Coexistence with Metrics (ADR-0066 §1)
 *
 * `Metric/STREAK_DAYS` (packages/metrics) remains the analytical source of
 * truth and the trigger for achievement unlocks. StreakTracker is a separate
 * aggregate dedicated to real-time gameplay state (freeze tokens, incremental
 * updates, user-facing streak display).
 *
 * ## Activity sources (ADR-0066 §2)
 *
 * Only confirmed `ExecutionRecordedEvent` events count toward a streak.
 * SelfLog, Booking, and Assessment events are excluded in MVP to prevent
 * trivial streak manipulation.
 *
 * ## Deduplication invariant (ADR-0066 §4)
 *
 * Calling `recordActivity()` with the same `activityDay` as `lastActivityDay`
 * is a no-op. Multiple executions on the same day increment the streak exactly once.
 *
 * ## Freeze token rules (ADR-0066 §3)
 *
 * - Earned at every 7-day milestone (7, 14, 21, …) while streak is active.
 * - Maximum 2 tokens at any time.
 * - Never auto-consumed — user manually calls `UseStreakFreezeTokenUseCase`.
 * - Spending a token sets `lastActivityDay = yesterday` to preserve the chain.
 *
 * ## Pure state machine (ADR-0009 §3)
 *
 * The aggregate MUST NOT dispatch domain events. The Application layer
 * constructs and publishes events after `repository.save()` (ADR-0009 §4).
 */
export class StreakTracker extends AggregateRoot<StreakTrackerProps> {
  private constructor(id: string, props: StreakTrackerProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new StreakTracker for a user with zeroed state.
   * Called by `UpdateStreakTrackerUseCase` on first activity.
   */
  static create(props: {
    id?: string;
    userId: string;
    createdAtUtc: UTCDateTime;
    updatedAtUtc: UTCDateTime;
  }): DomainResult<StreakTracker> {
    const id = props.id ?? generateId();
    return right(
      new StreakTracker(
        id,
        {
          userId: props.userId,
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDay: null,
          streakStartDay: null,
          freezeTokenCount: 0,
          freezeTokensEarnedTotal: 0,
          freezeTokensUsedTotal: 0,
          createdAtUtc: props.createdAtUtc,
          updatedAtUtc: props.updatedAtUtc,
        },
        0,
      ),
    );
  }

  /** Reconstitutes a StreakTracker from persisted storage. No validation. */
  static reconstitute(id: string, props: StreakTrackerProps, version: number): StreakTracker {
    return new StreakTracker(id, props, version);
  }

  // ── State transitions ──────────────────────────────────────────────────────

  /**
   * Records a new activity day and updates the streak accordingly.
   *
   * ## Outcomes
   *
   * - `noop` — same day as `lastActivityDay`; idempotent, no state change.
   * - `started` — first activity ever, or restart after break (currentStreak was 0).
   * - `incremented` — consecutive day; streak advances. May include freeze token earn.
   * - `restarted` — gap detected (non-consecutive day while streak was active);
   *   the previous streak is implicitly broken and a new run of 1 begins.
   *   The Application layer MUST publish `StreakBrokenEvent` + `StreakIncrementedEvent`.
   *
   * ## Preconditions (enforced by Application layer before calling)
   *
   * - `activityDay` is not in the future (validated by UseCase).
   * - `activityDay` is within the 2-day retroactive window (validated by UseCase).
   * - The Execution status is CONFIRMED (validated by event source filter).
   */
  recordActivity(activityDay: ActivityDay): DomainResult<ActivityRecordOutcome> {
    // ── Idempotency ──────────────────────────────────────────────────────────
    if (this.props.lastActivityDay !== null && activityDay.value === this.props.lastActivityDay) {
      return right({ type: 'noop' });
    }

    // ── Start fresh (never started or already broken) ─────────────────────
    if (this.props.currentStreak === 0 || this.props.lastActivityDay === null) {
      this.props.currentStreak = 1;
      this.props.lastActivityDay = activityDay.value;
      this.props.streakStartDay = activityDay.value;
      if (1 > this.props.longestStreak) {
        this.props.longestStreak = 1;
      }
      this.props.updatedAtUtc = UTCDateTime.now();
      return right({ type: 'started', earnedFreezeToken: false });
    }

    // ── Consecutive check ─────────────────────────────────────────────────
    const lastDayResult = ActivityDay.fromString(this.props.lastActivityDay);
    /* c8 ignore start — defensive: lastActivityDay is always written by this class via activityDay.value which has already been validated */
    if (lastDayResult.isLeft()) {
      return left(lastDayResult.value);
    }
    /* c8 ignore end */
    const lastDay = lastDayResult.value;
    const isConsecutive = lastDay.isConsecutiveTo(activityDay);

    if (isConsecutive) {
      const newStreak = Math.min(this.props.currentStreak + 1, MAX_STREAK_VALUE);
      const isNewRecord = newStreak > this.props.longestStreak;

      this.props.currentStreak = newStreak;
      this.props.lastActivityDay = activityDay.value;

      if (isNewRecord) {
        this.props.longestStreak = newStreak;
      }

      // Earn freeze token at every 7-day milestone (7, 14, 21, …)
      let earnedFreezeToken = false;
      if (newStreak % 7 === 0 && this.props.freezeTokenCount < MAX_FREEZE_TOKENS) {
        this.props.freezeTokenCount++;
        this.props.freezeTokensEarnedTotal++;
        earnedFreezeToken = true;
      }

      this.props.updatedAtUtc = UTCDateTime.now();
      return right({
        type: 'incremented',
        newCurrentStreak: newStreak,
        earnedFreezeToken,
        isNewRecord,
      });
    }

    // ── Gap detected — implicit break + fresh start ───────────────────────
    const previousStreak = this.props.currentStreak;
    this.props.currentStreak = 1;
    this.props.lastActivityDay = activityDay.value;
    this.props.streakStartDay = activityDay.value;
    this.props.updatedAtUtc = UTCDateTime.now();
    return right({ type: 'restarted', previousStreak, earnedFreezeToken: false });
  }

  /**
   * Consumes one freeze token to preserve a streak that is at risk.
   *
   * Sets `lastActivityDay = yesterday` so the streak chain remains unbroken.
   * The user MUST call this manually — it is never invoked automatically.
   *
   * ## Preconditions
   *
   * - `isAtRisk(todayStr)` must return `true` (validated by Application layer).
   * - `freezeTokenCount` must be ≥ 1 (enforced here).
   */
  useFreezeToken(todayStr: string): DomainResult<void> {
    if (this.props.freezeTokenCount <= 0) {
      return left(new NoFreezeTokensAvailableError());
    }

    if (!this.isAtRisk(todayStr)) {
      return left(new StreakNotAtRiskError());
    }

    this.props.freezeTokenCount--;
    this.props.freezeTokensUsedTotal++;

    // Set lastActivityDay to yesterday so the next consecutive check passes
    const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
    this.props.lastActivityDay = new Date(todayMs - ONE_DAY_MS).toISOString().slice(0, 10);

    this.props.updatedAtUtc = UTCDateTime.now();
    return right(undefined);
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  /**
   * True when the streak is in danger of breaking.
   *
   * A streak is at risk when it is active (> 0) but the last recorded activity
   * day is before yesterday in UTC. Without a new activity or a freeze token,
   * the streak will break on the next `CheckStreakIntegrityUseCase` run.
   *
   * @param todayStr YYYY-MM-DD in UTC — passed by the caller to keep the aggregate pure.
   */
  isAtRisk(todayStr: string): boolean {
    if (!this.props.lastActivityDay || this.props.currentStreak === 0) return false;
    const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
    const yesterdayStr = new Date(todayMs - ONE_DAY_MS).toISOString().slice(0, 10);
    return this.props.lastActivityDay < yesterdayStr;
  }

  /** True when at least one freeze token is available. */
  hasFreezeTokens(): boolean {
    return this.props.freezeTokenCount > 0;
  }

  /**
   * Number of additional streak days needed to earn the next freeze token.
   * Returns 7 when streak is 0 (no token progress).
   */
  daysUntilNextFreezeToken(): number {
    if (this.props.currentStreak === 0) return 7;
    const remainder = this.props.currentStreak % 7;
    return remainder === 0 ? 7 : 7 - remainder;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get userId(): string {
    return this.props.userId;
  }

  get currentStreak(): number {
    return this.props.currentStreak;
  }

  get longestStreak(): number {
    return this.props.longestStreak;
  }

  get lastActivityDay(): string | null {
    return this.props.lastActivityDay;
  }

  get streakStartDay(): string | null {
    return this.props.streakStartDay;
  }

  get freezeTokenCount(): number {
    return this.props.freezeTokenCount;
  }

  get freezeTokensEarnedTotal(): number {
    return this.props.freezeTokensEarnedTotal;
  }

  get freezeTokensUsedTotal(): number {
    return this.props.freezeTokensUsedTotal;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }

  get updatedAtUtc(): UTCDateTime {
    return this.props.updatedAtUtc;
  }
}
