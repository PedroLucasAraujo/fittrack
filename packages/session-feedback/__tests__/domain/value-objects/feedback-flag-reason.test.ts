import { describe, it, expect } from 'vitest';
import { FeedbackFlagReason } from '../../../domain/value-objects/feedback-flag-reason.js';

describe('FeedbackFlagReason', () => {
  describe('create()', () => {
    it('accepts a valid reason (10-200 chars)', () => {
      const result = FeedbackFlagReason.create('This feedback is abusive and offensive.');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('This feedback is abusive and offensive.');
      }
    });

    it('accepts exactly 10 characters', () => {
      const result = FeedbackFlagReason.create('1234567890');
      expect(result.isRight()).toBe(true);
    });

    it('accepts exactly 200 characters', () => {
      const result = FeedbackFlagReason.create('a'.repeat(200));
      expect(result.isRight()).toBe(true);
    });

    it('rejects reason shorter than 10 chars', () => {
      const result = FeedbackFlagReason.create('Too short');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects reason longer than 200 chars', () => {
      const result = FeedbackFlagReason.create('a'.repeat(201));
      expect(result.isLeft()).toBe(true);
    });

    it('trims surrounding whitespace', () => {
      const result = FeedbackFlagReason.create('  Abusive language used.  ');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('Abusive language used.');
      }
    });

    it('rejects blank-only string', () => {
      const result = FeedbackFlagReason.create('         ');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = FeedbackFlagReason.create('Abusive language used.').value as FeedbackFlagReason;
      const b = FeedbackFlagReason.create('Abusive language used.').value as FeedbackFlagReason;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = FeedbackFlagReason.create('Abusive language used.').value as FeedbackFlagReason;
      const b = FeedbackFlagReason.create('Inappropriate content here.')
        .value as FeedbackFlagReason;
      expect(a.equals(b)).toBe(false);
    });
  });
});
