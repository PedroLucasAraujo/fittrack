import { describe, it, expect } from 'vitest';
import { ReviewComment } from '../../../domain/value-objects/review-comment.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

describe('ReviewComment', () => {
  describe('create()', () => {
    it('creates a valid comment with 10+ characters', () => {
      const result = ReviewComment.create('Excellent service!');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('Excellent service!');
      }
    });

    it('trims surrounding whitespace', () => {
      const result = ReviewComment.create('  Great work  ');
      if (result.isRight()) {
        expect(result.value.value).toBe('Great work');
      }
    });

    it('returns Left<InvalidCommentError> for blank comment', () => {
      const result = ReviewComment.create('   ');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ReviewErrorCodes.INVALID_COMMENT);
      }
    });

    it('returns Left<InvalidCommentError> for comment shorter than 10 chars', () => {
      const result = ReviewComment.create('Short');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left<InvalidCommentError> for comment longer than 1000 chars', () => {
      const result = ReviewComment.create('x'.repeat(1001));
      expect(result.isLeft()).toBe(true);
    });

    it('accepts exactly 10 characters', () => {
      const result = ReviewComment.create('1234567890');
      expect(result.isRight()).toBe(true);
    });

    it('accepts exactly 1000 characters', () => {
      const result = ReviewComment.create('x'.repeat(1000));
      expect(result.isRight()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('returns true for comments with the same trimmed value', () => {
      const a = ReviewComment.create('Same comment text.').value as ReviewComment;
      const b = ReviewComment.create('Same comment text.').value as ReviewComment;
      expect(a.equals(b)).toBe(true);
    });
  });
});
