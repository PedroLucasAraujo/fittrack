import { describe, it, expect } from 'vitest';
import { FeedbackComment } from '../../../domain/value-objects/feedback-comment.js';

describe('FeedbackComment', () => {
  describe('create()', () => {
    it('accepts a valid comment (10-500 chars)', () => {
      const result = FeedbackComment.create('Great session today!');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('Great session today!');
      }
    });

    it('accepts exactly 10 characters', () => {
      const result = FeedbackComment.create('1234567890');
      expect(result.isRight()).toBe(true);
    });

    it('accepts exactly 500 characters', () => {
      const result = FeedbackComment.create('a'.repeat(500));
      expect(result.isRight()).toBe(true);
    });

    it('rejects blank string', () => {
      const result = FeedbackComment.create('   ');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty string', () => {
      const result = FeedbackComment.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects comment shorter than 10 chars', () => {
      const result = FeedbackComment.create('Too short');
      expect(result.isLeft()).toBe(true);
    });

    it('rejects comment longer than 500 chars', () => {
      const result = FeedbackComment.create('a'.repeat(501));
      expect(result.isLeft()).toBe(true);
    });

    it('trims surrounding whitespace', () => {
      const result = FeedbackComment.create('  Great session today!  ');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('Great session today!');
      }
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = FeedbackComment.create('Great session today!').value as FeedbackComment;
      const b = FeedbackComment.create('Great session today!').value as FeedbackComment;
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = FeedbackComment.create('Great session today!').value as FeedbackComment;
      const b = FeedbackComment.create('Not so great session today!').value as FeedbackComment;
      expect(a.equals(b)).toBe(false);
    });
  });
});
