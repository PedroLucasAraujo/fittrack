import { describe, it, expect } from 'vitest';
import { RewardPolicy } from '../../../../domain/value-objects/reward-policy.js';

describe('RewardPolicy', () => {
  describe('create()', () => {
    it('creates WINNER policy', () => {
      const result = RewardPolicy.create('WINNER');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('WINNER');
    });

    it('creates TOP_3 policy', () => {
      const result = RewardPolicy.create('TOP_3');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('TOP_3');
    });

    it('creates TOP_10 policy', () => {
      const result = RewardPolicy.create('TOP_10');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('TOP_10');
    });

    it('creates ALL_COMPLETERS policy', () => {
      const result = RewardPolicy.create('ALL_COMPLETERS');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('ALL_COMPLETERS');
    });

    it('rejects invalid policy', () => {
      const result = RewardPolicy.create('INVALID');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      const result = RewardPolicy.create('');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('getEligibleRanks()', () => {
    it('returns [1] for WINNER', () => {
      const p = RewardPolicy.create('WINNER').value as RewardPolicy;
      expect(p.getEligibleRanks()).toEqual([1]);
    });

    it('returns [1, 2, 3] for TOP_3', () => {
      const p = RewardPolicy.create('TOP_3').value as RewardPolicy;
      expect(p.getEligibleRanks()).toEqual([1, 2, 3]);
    });

    it('returns [1..10] for TOP_10', () => {
      const p = RewardPolicy.create('TOP_10').value as RewardPolicy;
      const ranks = p.getEligibleRanks();
      expect(ranks).toHaveLength(10);
      expect(ranks![0]).toBe(1);
      expect(ranks![9]).toBe(10);
    });

    it('returns null for ALL_COMPLETERS', () => {
      const p = RewardPolicy.create('ALL_COMPLETERS').value as RewardPolicy;
      expect(p.getEligibleRanks()).toBeNull();
    });
  });

  describe('policy type guards', () => {
    it('isWinner() returns true for WINNER', () => {
      const p = RewardPolicy.create('WINNER').value as RewardPolicy;
      expect(p.isWinner()).toBe(true);
    });

    it('isTop3() returns true for TOP_3', () => {
      const p = RewardPolicy.create('TOP_3').value as RewardPolicy;
      expect(p.isTop3()).toBe(true);
    });

    it('isTop10() returns true for TOP_10', () => {
      const p = RewardPolicy.create('TOP_10').value as RewardPolicy;
      expect(p.isTop10()).toBe(true);
    });

    it('isAllCompleters() returns true for ALL_COMPLETERS', () => {
      const p = RewardPolicy.create('ALL_COMPLETERS').value as RewardPolicy;
      expect(p.isAllCompleters()).toBe(true);
    });

    it('isWinner() returns false for TOP_3', () => {
      const p = RewardPolicy.create('TOP_3').value as RewardPolicy;
      expect(p.isWinner()).toBe(false);
    });
  });
});
