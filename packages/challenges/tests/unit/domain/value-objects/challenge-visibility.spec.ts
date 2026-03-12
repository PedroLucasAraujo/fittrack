import { describe, it, expect } from 'vitest';
import { ChallengeVisibility } from '../../../../domain/value-objects/challenge-visibility.js';

describe('ChallengeVisibility', () => {
  describe('create()', () => {
    it('creates PUBLIC visibility', () => {
      const result = ChallengeVisibility.create('PUBLIC');
      expect(result.isRight()).toBe(true);
      expect((result.value as ChallengeVisibility).value).toBe('PUBLIC');
    });

    it('creates PROFESSIONAL visibility', () => {
      const result = ChallengeVisibility.create('PROFESSIONAL');
      expect(result.isRight()).toBe(true);
      expect((result.value as ChallengeVisibility).value).toBe('PROFESSIONAL');
    });

    it('creates PRIVATE visibility', () => {
      const result = ChallengeVisibility.create('PRIVATE');
      expect(result.isRight()).toBe(true);
      expect((result.value as ChallengeVisibility).value).toBe('PRIVATE');
    });

    it('rejects invalid visibility', () => {
      const result = ChallengeVisibility.create('INVALID');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      const result = ChallengeVisibility.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects lowercase valid value', () => {
      const result = ChallengeVisibility.create('public');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isPublic()', () => {
    it('returns true for PUBLIC', () => {
      const v = ChallengeVisibility.create('PUBLIC').value as ChallengeVisibility;
      expect(v.isPublic()).toBe(true);
    });

    it('returns false for PRIVATE', () => {
      const v = ChallengeVisibility.create('PRIVATE').value as ChallengeVisibility;
      expect(v.isPublic()).toBe(false);
    });
  });

  describe('isProfessional()', () => {
    it('returns true for PROFESSIONAL', () => {
      const v = ChallengeVisibility.create('PROFESSIONAL').value as ChallengeVisibility;
      expect(v.isProfessional()).toBe(true);
    });

    it('returns false for PUBLIC', () => {
      const v = ChallengeVisibility.create('PUBLIC').value as ChallengeVisibility;
      expect(v.isProfessional()).toBe(false);
    });
  });

  describe('isPrivate()', () => {
    it('returns true for PRIVATE', () => {
      const v = ChallengeVisibility.create('PRIVATE').value as ChallengeVisibility;
      expect(v.isPrivate()).toBe(true);
    });

    it('returns false for PUBLIC', () => {
      const v = ChallengeVisibility.create('PUBLIC').value as ChallengeVisibility;
      expect(v.isPrivate()).toBe(false);
    });
  });

  describe('requiresInvite()', () => {
    it('returns true for PRIVATE', () => {
      const v = ChallengeVisibility.create('PRIVATE').value as ChallengeVisibility;
      expect(v.requiresInvite()).toBe(true);
    });

    it('returns false for PUBLIC', () => {
      const v = ChallengeVisibility.create('PUBLIC').value as ChallengeVisibility;
      expect(v.requiresInvite()).toBe(false);
    });

    it('returns false for PROFESSIONAL', () => {
      const v = ChallengeVisibility.create('PROFESSIONAL').value as ChallengeVisibility;
      expect(v.requiresInvite()).toBe(false);
    });
  });
});
