import { describe, it, expect } from 'vitest';
import { ChallengeType } from '../../../../domain/value-objects/challenge-type.js';

describe('ChallengeType', () => {
  describe('create()', () => {
    it('creates INDIVIDUAL type', () => {
      const result = ChallengeType.create('INDIVIDUAL');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('INDIVIDUAL');
    });

    it('creates COMMUNITY type', () => {
      const result = ChallengeType.create('COMMUNITY');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('COMMUNITY');
    });

    it('creates HEAD_TO_HEAD type', () => {
      const result = ChallengeType.create('HEAD_TO_HEAD');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('HEAD_TO_HEAD');
    });

    it('rejects invalid type', () => {
      const result = ChallengeType.create('INVALID');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      const result = ChallengeType.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects lowercase valid value', () => {
      const result = ChallengeType.create('individual');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isIndividual()', () => {
    it('returns true for INDIVIDUAL', () => {
      const t = ChallengeType.create('INDIVIDUAL').value as ChallengeType;
      expect(t.isIndividual()).toBe(true);
    });

    it('returns false for COMMUNITY', () => {
      const t = ChallengeType.create('COMMUNITY').value as ChallengeType;
      expect(t.isIndividual()).toBe(false);
    });
  });

  describe('isCommunity()', () => {
    it('returns true for COMMUNITY', () => {
      const t = ChallengeType.create('COMMUNITY').value as ChallengeType;
      expect(t.isCommunity()).toBe(true);
    });

    it('returns false for HEAD_TO_HEAD', () => {
      const t = ChallengeType.create('HEAD_TO_HEAD').value as ChallengeType;
      expect(t.isCommunity()).toBe(false);
    });
  });

  describe('isHeadToHead()', () => {
    it('returns true for HEAD_TO_HEAD', () => {
      const t = ChallengeType.create('HEAD_TO_HEAD').value as ChallengeType;
      expect(t.isHeadToHead()).toBe(true);
    });

    it('returns false for INDIVIDUAL', () => {
      const t = ChallengeType.create('INDIVIDUAL').value as ChallengeType;
      expect(t.isHeadToHead()).toBe(false);
    });
  });

  describe('getMinParticipants()', () => {
    it('returns 1 for INDIVIDUAL', () => {
      const t = ChallengeType.create('INDIVIDUAL').value as ChallengeType;
      expect(t.getMinParticipants()).toBe(1);
    });

    it('returns 1 for COMMUNITY', () => {
      const t = ChallengeType.create('COMMUNITY').value as ChallengeType;
      expect(t.getMinParticipants()).toBe(1);
    });

    it('returns 2 for HEAD_TO_HEAD', () => {
      const t = ChallengeType.create('HEAD_TO_HEAD').value as ChallengeType;
      expect(t.getMinParticipants()).toBe(2);
    });
  });

  describe('getMaxParticipants()', () => {
    it('returns 1 for INDIVIDUAL', () => {
      const t = ChallengeType.create('INDIVIDUAL').value as ChallengeType;
      expect(t.getMaxParticipants()).toBe(1);
    });

    it('returns 2 for HEAD_TO_HEAD', () => {
      const t = ChallengeType.create('HEAD_TO_HEAD').value as ChallengeType;
      expect(t.getMaxParticipants()).toBe(2);
    });

    it('returns null for COMMUNITY', () => {
      const t = ChallengeType.create('COMMUNITY').value as ChallengeType;
      expect(t.getMaxParticipants()).toBeNull();
    });
  });
});
