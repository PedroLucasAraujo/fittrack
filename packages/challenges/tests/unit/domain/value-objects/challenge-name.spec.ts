import { describe, it, expect } from 'vitest';
import { ChallengeName } from '../../../../domain/value-objects/challenge-name.js';

describe('ChallengeName', () => {
  describe('create()', () => {
    it('creates a valid name with exactly 3 characters', () => {
      const result = ChallengeName.create('ABC');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('ABC');
    });

    it('creates a valid name with exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      const result = ChallengeName.create(name);
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toHaveLength(100);
    });

    it('creates a name and trims leading/trailing whitespace', () => {
      const result = ChallengeName.create('  My Challenge  ');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('My Challenge');
    });

    it('creates a normal name successfully', () => {
      const result = ChallengeName.create('Spring Fitness Challenge');
      expect(result.isRight()).toBe(true);
    });

    it('rejects a name shorter than 3 characters', () => {
      const result = ChallengeName.create('AB');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects an empty string', () => {
      const result = ChallengeName.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects a name that is only whitespace', () => {
      const result = ChallengeName.create('   ');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects a name longer than 100 characters', () => {
      const result = ChallengeName.create('A'.repeat(101));
      expect(result.isLeft()).toBe(true);
    });

    it('accepts exactly 3 characters after trimming', () => {
      const result = ChallengeName.create('  ABC  ');
      expect(result.isRight()).toBe(true);
      expect(result.value.value).toBe('ABC');
    });
  });
});
