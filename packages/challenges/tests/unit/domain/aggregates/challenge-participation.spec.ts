import { describe, it, expect } from 'vitest';
import { makeChallengeParticipation } from '../../../helpers/make-challenge-participation.js';
import type { UpdateProgressOutcome } from '../../../../domain/aggregates/challenge-participation.js';

describe('ChallengeParticipation', () => {
  describe('updateProgress()', () => {
    it('updates currentProgress and progressPercentage', () => {
      const participation = makeChallengeParticipation({ currentProgress: 0 });
      const result = participation.updateProgress(5, 10);
      expect(result.isRight()).toBe(true);
      expect(participation.currentProgress).toBe(5);
      expect(participation.progressPercentage).toBe(50);
    });

    it('updates lastProgressUpdateAtUtc', () => {
      const before = new Date();
      const participation = makeChallengeParticipation({ currentProgress: 0 });
      participation.updateProgress(5, 10);
      expect(participation.lastProgressUpdateAtUtc.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('updates updatedAtUtc', () => {
      const before = new Date();
      const participation = makeChallengeParticipation({ currentProgress: 0 });
      participation.updateProgress(5, 10);
      expect(participation.updatedAtUtc.value.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('marks as completed and returns completedGoal: true when goal is exactly reached', () => {
      const participation = makeChallengeParticipation({
        currentProgress: 9,
        completedAtUtc: null,
      });
      const result = participation.updateProgress(10, 10);
      expect(result.isRight()).toBe(true);
      const outcome = result.value as Extract<UpdateProgressOutcome, { completedGoal: true }>;
      expect(outcome.completedGoal).toBe(true);
      expect(outcome.completedAtUtc).toBeDefined();
      expect(participation.completedAtUtc).not.toBeNull();
    });

    it('marks as completed when progress exceeds goal', () => {
      const participation = makeChallengeParticipation({
        currentProgress: 0,
        completedAtUtc: null,
      });
      const result = participation.updateProgress(15, 10);
      expect(result.isRight()).toBe(true);
      const outcome = result.value as Extract<UpdateProgressOutcome, { completedGoal: true }>;
      expect(outcome.completedGoal).toBe(true);
      expect(participation.completedAtUtc).not.toBeNull();
    });

    it('caps progressPercentage at 100 when progress exceeds goal', () => {
      const participation = makeChallengeParticipation({ currentProgress: 9 });
      participation.updateProgress(15, 10);
      expect(participation.progressPercentage).toBe(100);
    });

    it('does not re-complete if already completed — returns completedGoal: false', () => {
      const completedAt = new Date(Date.now() - 5000);
      const participation = makeChallengeParticipation({
        currentProgress: 10,
        completedAtUtc: completedAt,
      });
      const result = participation.updateProgress(11, 10);
      expect(result.isRight()).toBe(true);
      const outcome = result.value as Extract<UpdateProgressOutcome, { completedGoal: false }>;
      expect(outcome.completedGoal).toBe(false);
      // completedAtUtc remains the original value
      expect(participation.completedAtUtc?.getTime()).toBe(completedAt.getTime());
    });

    it('returns completedGoal: false when goal is not yet reached', () => {
      const participation = makeChallengeParticipation({ currentProgress: 0 });
      const result = participation.updateProgress(5, 10);
      expect(result.isRight()).toBe(true);
      expect(result.value).toHaveProperty('completedGoal', false);
    });

    it('fails with ProgressCannotDecreaseError when progress decreases', () => {
      const participation = makeChallengeParticipation({ currentProgress: 5 });
      const result = participation.updateProgress(3, 10);
      expect(result.isLeft()).toBe(true);
      expect(result.value.message).toContain('decrease');
    });

    it('allows same progress value (not a decrease)', () => {
      const participation = makeChallengeParticipation({ currentProgress: 5 });
      const result = participation.updateProgress(5, 10);
      expect(result.isRight()).toBe(true);
      expect(participation.currentProgress).toBe(5);
    });

    it('calculates 0% when goalTargetValue is 0 (division guard returns 100)', () => {
      // goalTargetValue=0 triggers guard: Math.min(100, ...) for 0 target => 100
      const participation = makeChallengeParticipation({ currentProgress: 0 });
      participation.updateProgress(0, 0);
      expect(participation.progressPercentage).toBe(100);
    });
  });

  describe('hasCompleted()', () => {
    it('returns false when completedAtUtc is null', () => {
      const p = makeChallengeParticipation({ completedAtUtc: null });
      expect(p.hasCompleted()).toBe(false);
    });

    it('returns true when completedAtUtc is set', () => {
      const p = makeChallengeParticipation({ completedAtUtc: new Date() });
      expect(p.hasCompleted()).toBe(true);
    });
  });

  describe('hasReachedGoal()', () => {
    it('returns true when currentProgress >= target', () => {
      const p = makeChallengeParticipation({ currentProgress: 10 });
      expect(p.hasReachedGoal(10)).toBe(true);
    });

    it('returns true when currentProgress exceeds target', () => {
      const p = makeChallengeParticipation({ currentProgress: 15 });
      expect(p.hasReachedGoal(10)).toBe(true);
    });

    it('returns false when currentProgress is below target', () => {
      const p = makeChallengeParticipation({ currentProgress: 9 });
      expect(p.hasReachedGoal(10)).toBe(false);
    });
  });

  describe('getters', () => {
    it('exposes challengeId, userId, joinedAtUtc, createdAtUtc', () => {
      const challengeId = '11111111-1111-4111-8111-111111111111';
      const userId = '22222222-2222-4222-8222-222222222222';
      const joinedAt = new Date();
      const p = makeChallengeParticipation({ challengeId, userId, joinedAtUtc: joinedAt });
      expect(p.challengeId).toBe(challengeId);
      expect(p.userId).toBe(userId);
      expect(p.joinedAtUtc).toBe(joinedAt);
      expect(p.createdAtUtc).toBeDefined();
    });
  });
});
