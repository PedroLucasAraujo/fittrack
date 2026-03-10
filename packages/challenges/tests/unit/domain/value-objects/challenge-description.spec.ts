import { describe, it, expect } from 'vitest';
import { ChallengeDescription } from '../../../../domain/value-objects/challenge-description.js';

describe('ChallengeDescription', () => {
  describe('create()', () => {
    it('creates a valid description with exactly 10 characters', () => {
      const result = ChallengeDescription.create('1234567890');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('1234567890');
    });

    it('creates a valid description with exactly 1000 characters', () => {
      const desc = 'A'.repeat(1000);
      const result = ChallengeDescription.create(desc);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toHaveLength(1000);
    });

    it('creates a normal description successfully', () => {
      const result = ChallengeDescription.create('This is a valid description for a challenge.');
      expect(result.isRight()).toBe(true);
    });

    it('trims leading/trailing whitespace from description', () => {
      const result = ChallengeDescription.create('  A valid description.  ');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('A valid description.');
    });

    it('rejects a description shorter than 10 characters', () => {
      const result = ChallengeDescription.create('Short');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects an empty string', () => {
      const result = ChallengeDescription.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects a string that is only whitespace', () => {
      const result = ChallengeDescription.create('         ');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects a description longer than 1000 characters', () => {
      const result = ChallengeDescription.create('A'.repeat(1001));
      expect(result.isLeft()).toBe(true);
    });

    it('accepts exactly 10 characters after trimming', () => {
      const result = ChallengeDescription.create('  1234567890  ');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('1234567890');
    });
  });
});
