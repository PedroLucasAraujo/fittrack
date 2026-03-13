import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidEngagementScoreError } from '../errors/InvalidEngagementScoreError.js';

/**
 * EngagementScore value object — an integer from 0 to 100.
 *
 * Reused for all five score dimensions:
 * - workoutScore: frequency vs. weekly target
 * - habitScore: consistency of nutrition logs
 * - goalProgressScore: % goals on track
 * - streakScore: consecutive active days vs. target
 * - overallScore: weighted aggregate
 *
 * Calculation helpers are static factory methods so that callers can
 * express business intent (e.g., `EngagementScore.fromWorkouts(3, 4)`)
 * without knowing the formula internally.
 */
export class EngagementScore {
  private constructor(readonly value: number) {}

  /**
   * Creates an EngagementScore from an arbitrary value.
   * The value is rounded to the nearest integer before validation.
   */
  static create(raw: number): DomainResult<EngagementScore> {
    const rounded = Math.round(raw);
    if (!Number.isFinite(rounded) || rounded < 0 || rounded > 100) {
      return left(new InvalidEngagementScoreError(raw));
    }
    return right(new EngagementScore(rounded));
  }

  /**
   * Calculates a workout frequency score.
   * score = min(round(completed / target * 100), 100)
   * If target is 0, returns 100 (no workouts expected).
   */
  static fromWorkouts(completed: number, targetPerWeek: number = 4): EngagementScore {
    if (targetPerWeek <= 0) return new EngagementScore(100);
    const score = Math.min(Math.round((completed / targetPerWeek) * 100), 100);
    return new EngagementScore(score);
  }

  /**
   * Calculates a habit consistency score from days with at least one nutrition log.
   * score = round(daysWithLog / 7 * 100)
   */
  static fromHabit(daysWithNutritionLog: number): EngagementScore {
    const score = Math.min(Math.round((daysWithNutritionLog / 7) * 100), 100);
    return new EngagementScore(Math.max(0, score));
  }

  /**
   * Calculates a goal progress score.
   * If no active goals, returns 100 (no penalty).
   * score = round(onTrack / activeGoals * 100)
   */
  static fromGoalProgress(goalsOnTrack: number, activeGoals: number): EngagementScore {
    if (activeGoals <= 0) return new EngagementScore(100);
    const score = Math.min(Math.round((goalsOnTrack / activeGoals) * 100), 100);
    return new EngagementScore(Math.max(0, score));
  }

  /**
   * Calculates a streak score.
   * score = min(round(currentStreak / targetStreak * 100), 100)
   * targetStreak defaults to 30 days.
   */
  static fromStreak(currentStreak: number, targetStreak: number = 30): EngagementScore {
    if (targetStreak <= 0) return new EngagementScore(100);
    const score = Math.min(Math.round((currentStreak / targetStreak) * 100), 100);
    return new EngagementScore(Math.max(0, score));
  }

  /**
   * Calculates the weighted overall engagement score (ADR-0058 / ADR-0069).
   *
   * Weights:
   * - workout:  40%
   * - habit:    25%
   * - goal:     20%
   * - streak:   15%
   */
  static fromWeighted(
    workoutScore: EngagementScore,
    habitScore: EngagementScore,
    goalProgressScore: EngagementScore,
    streakScore: EngagementScore,
  ): EngagementScore {
    const overall =
      workoutScore.value * 0.4 +
      habitScore.value * 0.25 +
      goalProgressScore.value * 0.2 +
      streakScore.value * 0.15;
    return new EngagementScore(Math.round(overall));
  }

  isVeryHigh(): boolean {
    return this.value >= 80;
  }

  isHigh(): boolean {
    return this.value >= 60 && this.value < 80;
  }

  isMedium(): boolean {
    return this.value >= 40 && this.value < 60;
  }

  isLow(): boolean {
    return this.value >= 20 && this.value < 40;
  }

  isVeryLow(): boolean {
    return this.value < 20;
  }

  equals(other: EngagementScore): boolean {
    return this.value === other.value;
  }
}
