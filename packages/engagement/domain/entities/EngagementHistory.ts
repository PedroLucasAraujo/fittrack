import { BaseEntity, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { EngagementErrorCodes } from '../errors/engagement-error-codes.js';

class InvalidHistoryEntryError extends DomainError {
  constructor(reason: string) {
    super(
      `Invalid EngagementHistory entry: ${reason}`,
      EngagementErrorCodes.INVALID_HISTORY_ENTRY as unknown as ErrorCode,
    );
  }
}

export interface EngagementHistoryProps {
  /** Cross-aggregate reference: ID only (ADR-0047). */
  readonly userId: string;
  /** Monday 00:00 UTC of the week (YYYY-MM-DD). */
  readonly weekStartDate: string;
  /** Sunday 23:59 UTC of the week (YYYY-MM-DD). */
  readonly weekEndDate: string;
  /** Weighted overall score snapshot (0–100). */
  readonly overallScore: number;
  readonly workoutScore: number;
  readonly habitScore: number;
  readonly goalProgressScore: number;
  readonly streakScore: number;
  readonly engagementLevel: string;
  readonly workoutsCompleted: number;
  readonly nutritionLogsCreated: number;
  readonly bookingsAttended: number;
  readonly currentStreak: number;
  /** UTC ISO 8601 when this snapshot was created. Immutable (ADR-0011). */
  readonly createdAtUtc: string;
}

/**
 * EngagementHistory is an immutable weekly snapshot entity owned by UserEngagement.
 *
 * Immutable after creation (ADR-0011). Used to compute trends and render
 * historical engagement charts. Only the last 12 entries are retained per user.
 *
 * Subordinate entity — never accessed by ID from outside the aggregate boundary.
 */
export class EngagementHistory extends BaseEntity<EngagementHistoryProps> {
  private constructor(id: string, props: EngagementHistoryProps) {
    super(id, props);
  }

  static create(params: {
    id?: string;
    userId: string;
    weekStartDate: string;
    weekEndDate: string;
    overallScore: number;
    workoutScore: number;
    habitScore: number;
    goalProgressScore: number;
    streakScore: number;
    engagementLevel: string;
    workoutsCompleted: number;
    nutritionLogsCreated: number;
    bookingsAttended: number;
    currentStreak: number;
    createdAtUtc?: string;
  }): DomainResult<EngagementHistory> {
    if (!params.userId || params.userId.trim().length === 0) {
      return left(new InvalidHistoryEntryError('userId is required'));
    }
    if (!params.weekStartDate || params.weekStartDate.trim().length === 0) {
      return left(new InvalidHistoryEntryError('weekStartDate is required'));
    }
    if (!params.weekEndDate || params.weekEndDate.trim().length === 0) {
      return left(new InvalidHistoryEntryError('weekEndDate is required'));
    }

    const id = params.id ?? generateId();
    return right(
      new EngagementHistory(id, {
        userId: params.userId,
        weekStartDate: params.weekStartDate,
        weekEndDate: params.weekEndDate,
        overallScore: params.overallScore,
        workoutScore: params.workoutScore,
        habitScore: params.habitScore,
        goalProgressScore: params.goalProgressScore,
        streakScore: params.streakScore,
        engagementLevel: params.engagementLevel,
        workoutsCompleted: params.workoutsCompleted,
        nutritionLogsCreated: params.nutritionLogsCreated,
        bookingsAttended: params.bookingsAttended,
        currentStreak: params.currentStreak,
        createdAtUtc: params.createdAtUtc ?? new Date().toISOString(),
      }),
    );
  }

  /** Reconstitutes from persistence without validation. */
  static reconstitute(id: string, props: EngagementHistoryProps): EngagementHistory {
    return new EngagementHistory(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get weekStartDate(): string {
    return this.props.weekStartDate;
  }

  get weekEndDate(): string {
    return this.props.weekEndDate;
  }

  get overallScore(): number {
    return this.props.overallScore;
  }

  get workoutScore(): number {
    return this.props.workoutScore;
  }

  get habitScore(): number {
    return this.props.habitScore;
  }

  get goalProgressScore(): number {
    return this.props.goalProgressScore;
  }

  get streakScore(): number {
    return this.props.streakScore;
  }

  get engagementLevel(): string {
    return this.props.engagementLevel;
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

  get createdAtUtc(): string {
    return this.props.createdAtUtc;
  }
}
