import { AggregateRoot, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { CurrentValue } from '../value-objects/current-value.js';
import type { TargetValue } from '../value-objects/target-value.js';
import { ProgressPercentage } from '../value-objects/progress-percentage.js';
import { AchievementAlreadyUnlockedError } from '../errors/achievement-already-unlocked-error.js';
import { InvalidProgressValueError } from '../errors/invalid-progress-value-error.js';

export interface UserAchievementProgressProps {
  /** Cross-aggregate reference: ID only (ADR-0047). Immutable. */
  userId: string;
  /** Cross-aggregate reference: ID only (ADR-0047). Immutable. */
  achievementDefinitionId: string;
  /**
   * The achievement code — copied from the definition at progress creation.
   * Avoids a join for event payloads. Immutable.
   */
  achievementCode: string;
  /**
   * Snapshot of the definition's tier value (e.g. 'BRONZE', 'GOLD').
   * Copied at progress creation to avoid a join in event payloads. Immutable.
   */
  achievementTier: string;
  /**
   * Snapshot of the definition's category value (e.g. 'WORKOUT', 'STREAK').
   * Copied at progress creation to avoid a join in event payloads. Immutable.
   */
  achievementCategory: string;
  /** The current progress count. Increases only (MVP invariant). */
  currentValue: CurrentValue;
  /** The target to reach for unlock — snapshot from definition criteria. Immutable. */
  targetValue: TargetValue;
  /**
   * UTC ISO string when the achievement was unlocked. Null if not yet unlocked.
   * Null = locked; non-null = unlocked. (ADR-0022 — no status enum).
   */
  unlockedAtUtc: string | null;
  /** UTC ISO string of last progress update. */
  lastUpdatedAtUtc: string;
  /** UTC ISO string of progress record creation. Immutable. */
  createdAtUtc: string;
}

/**
 * UserAchievementProgress aggregate root — tracks a single user's progress
 * toward a specific achievement definition.
 *
 * ## Unlock invariants
 * - currentValue only increases (MVP: never decreases).
 * - unlock() is idempotent — calling it when already unlocked returns an error.
 * - Once unlocked (unlockedAtUtc != null), the state is permanent in MVP.
 *
 * ## State detection (ADR-0022 — no status enum)
 * - isUnlocked(): true when unlockedAtUtc is not null.
 * - hasReachedTarget(): true when currentValue >= targetValue.
 *
 * ## Domain events (ADR-0009 §3)
 * Application layer constructs AchievementUnlockedEvent after unlock.
 */
export class UserAchievementProgress extends AggregateRoot<UserAchievementProgressProps> {
  private constructor(id: string, props: UserAchievementProgressProps, version: number = 0) {
    super(id, props, version);
  }

  static create(props: {
    id?: string;
    userId: string;
    achievementDefinitionId: string;
    achievementCode: string;
    achievementTier: string;
    achievementCategory: string;
    currentValue: CurrentValue;
    targetValue: TargetValue;
  }): DomainResult<UserAchievementProgress> {
    const now = new Date().toISOString();
    const id = props.id ?? generateId();
    const progress = new UserAchievementProgress(
      id,
      {
        userId: props.userId,
        achievementDefinitionId: props.achievementDefinitionId,
        achievementCode: props.achievementCode,
        achievementTier: props.achievementTier,
        achievementCategory: props.achievementCategory,
        currentValue: props.currentValue,
        targetValue: props.targetValue,
        unlockedAtUtc: null,
        lastUpdatedAtUtc: now,
        createdAtUtc: now,
      },
      0,
    );
    return right(progress);
  }

  static reconstitute(
    id: string,
    props: UserAchievementProgressProps,
    version: number,
  ): UserAchievementProgress {
    return new UserAchievementProgress(id, props, version);
  }

  // ── State transitions ──────────────────────────────────────────────────────

  /**
   * Updates the current progress value.
   *
   * MVP invariant: newValue must be >= existing currentValue.
   * Progress never decreases (streak resets etc. are handled at the handler level).
   */
  updateProgress(newValue: CurrentValue): DomainResult<void> {
    if (newValue.value < this.props.currentValue.value) {
      return left(
        new InvalidProgressValueError(
          `newValue (${newValue.value}) cannot be less than currentValue (${this.props.currentValue.value})`,
        ),
      );
    }
    this.props.currentValue = newValue;
    this.props.lastUpdatedAtUtc = new Date().toISOString();
    return right(undefined);
  }

  /**
   * Marks the achievement as unlocked at the current UTC instant.
   *
   * Returns AchievementAlreadyUnlockedError if already unlocked.
   * The Application layer must check hasReachedTarget() before calling unlock().
   */
  unlock(): DomainResult<void> {
    if (this.isUnlocked()) {
      return left(new AchievementAlreadyUnlockedError());
    }
    this.props.unlockedAtUtc = new Date().toISOString();
    this.props.lastUpdatedAtUtc = this.props.unlockedAtUtc;
    return right(undefined);
  }

  // ── Query helpers ──────────────────────────────────────────────────────────

  /** True when the achievement has been unlocked (ADR-0022 — method, not enum). */
  isUnlocked(): boolean {
    return this.props.unlockedAtUtc !== null;
  }

  /** True when currentValue has met or exceeded the target. */
  hasReachedTarget(): boolean {
    return this.props.currentValue.value >= this.props.targetValue.value;
  }

  /** Progress percentage (0–100), capped and rounded to integer. */
  progressPercentage(): ProgressPercentage {
    return ProgressPercentage.compute(this.props.currentValue.value, this.props.targetValue.value);
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get userId(): string {
    return this.props.userId;
  }

  get achievementDefinitionId(): string {
    return this.props.achievementDefinitionId;
  }

  get achievementCode(): string {
    return this.props.achievementCode;
  }

  get achievementTier(): string {
    return this.props.achievementTier;
  }

  get achievementCategory(): string {
    return this.props.achievementCategory;
  }

  get currentValue(): CurrentValue {
    return this.props.currentValue;
  }

  get targetValue(): TargetValue {
    return this.props.targetValue;
  }

  get unlockedAtUtc(): string | null {
    return this.props.unlockedAtUtc;
  }

  get lastUpdatedAtUtc(): string {
    return this.props.lastUpdatedAtUtc;
  }

  get createdAtUtc(): string {
    return this.props.createdAtUtc;
  }
}
