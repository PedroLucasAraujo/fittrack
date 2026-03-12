import { describe, it, expect } from 'vitest';
import { MaxParticipants } from '../../../../domain/value-objects/max-participants.js';

describe('MaxParticipants', () => {
  describe('create()', () => {
    it('creates with value 1 (minimum valid)', () => {
      const result = MaxParticipants.create(1);
      expect(result.isRight()).toBe(true);
      expect((result.value as MaxParticipants).value).toBe(1);
    });

    it('creates with value 2 (HEAD_TO_HEAD)', () => {
      const result = MaxParticipants.create(2);
      expect(result.isRight()).toBe(true);
      expect((result.value as MaxParticipants).value).toBe(2);
    });

    it('creates with large value', () => {
      const result = MaxParticipants.create(1000);
      expect(result.isRight()).toBe(true);
      expect((result.value as MaxParticipants).value).toBe(1000);
    });

    it('rejects 0', () => {
      const result = MaxParticipants.create(0);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects negative values', () => {
      const result = MaxParticipants.create(-1);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects non-integer values', () => {
      const result = MaxParticipants.create(1.5);
      expect(result.isLeft()).toBe(true);
    });

    it('rejects NaN', () => {
      const result = MaxParticipants.create(NaN);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isFull()', () => {
    it('returns true when currentCount equals maxParticipants', () => {
      const mp = MaxParticipants.create(5).value as MaxParticipants;
      expect(mp.isFull(5)).toBe(true);
    });

    it('returns true when currentCount exceeds maxParticipants', () => {
      const mp = MaxParticipants.create(5).value as MaxParticipants;
      expect(mp.isFull(6)).toBe(true);
    });

    it('returns false when currentCount is below maxParticipants', () => {
      const mp = MaxParticipants.create(5).value as MaxParticipants;
      expect(mp.isFull(4)).toBe(false);
    });

    it('returns false when currentCount is 0', () => {
      const mp = MaxParticipants.create(5).value as MaxParticipants;
      expect(mp.isFull(0)).toBe(false);
    });
  });
});
