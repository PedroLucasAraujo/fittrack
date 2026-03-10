import { describe, it, expect } from 'vitest';
import { FlagReason } from '../../../domain/value-objects/flag-reason.js';
import { OverallRating } from '../../../domain/value-objects/overall-rating.js';
import { ProfessionalResponse } from '../../../domain/value-objects/professional-response.js';
import { RecommendationRate } from '../../../domain/value-objects/recommendation-rate.js';
import { VerifiedInteraction } from '../../../domain/value-objects/verified-interaction.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

// ── FlagReason ────────────────────────────────────────────────────────────────

describe('FlagReason', () => {
  it('creates a valid flag reason', () => {
    const result = FlagReason.create('Spam content detected here.');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe('Spam content detected here.');
    }
  });

  it('trims surrounding whitespace', () => {
    const result = FlagReason.create('  Spam content  ');
    if (result.isRight()) {
      expect(result.value.value).toBe('Spam content');
    }
  });

  it('returns Left<InvalidCommentError> for reason shorter than 5 chars', () => {
    const result = FlagReason.create('No');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_COMMENT);
    }
  });

  it('returns Left<InvalidCommentError> for reason longer than 500 chars', () => {
    const result = FlagReason.create('x'.repeat(501));
    expect(result.isLeft()).toBe(true);
  });

  it('accepts exactly 5 characters', () => {
    const result = FlagReason.create('12345');
    expect(result.isRight()).toBe(true);
  });

  it('accepts exactly 500 characters', () => {
    const result = FlagReason.create('x'.repeat(500));
    expect(result.isRight()).toBe(true);
  });

  it('equals returns true for same value', () => {
    const a = FlagReason.create('Same reason text.').value as FlagReason;
    const b = FlagReason.create('Same reason text.').value as FlagReason;
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = FlagReason.create('Reason one here.').value as FlagReason;
    const b = FlagReason.create('Reason two here.').value as FlagReason;
    expect(a.equals(b)).toBe(false);
  });
});

// ── OverallRating ──────────────────────────────────────────────────────────────

describe('OverallRating', () => {
  describe('fromValues()', () => {
    it('calculates mean of 5 values', () => {
      const rating = OverallRating.fromValues(4, 5, 3, 4, 5);
      expect(rating.value).toBe(4.2); // 21/5 = 4.2
    });

    it('handles uniform values', () => {
      const rating = OverallRating.fromValues(5, 5, 5, 5, 5);
      expect(rating.value).toBe(5.0);
    });
  });

  describe('create()', () => {
    it('creates from valid value', () => {
      const result = OverallRating.create(4.5);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe(4.5);
      }
    });

    it('returns Left<InvalidRatingError> for value < 1.0', () => {
      const result = OverallRating.create(0.5);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ReviewErrorCodes.INVALID_RATING);
      }
    });

    it('returns Left<InvalidRatingError> for value > 5.0', () => {
      const result = OverallRating.create(5.5);
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left<InvalidRatingError> for non-number', () => {
      const result = OverallRating.create(NaN);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('returns true for same value', () => {
      const a = OverallRating.fromValues(4, 4, 4, 4, 4);
      const b = OverallRating.fromValues(4, 4, 4, 4, 4);
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('toNumber()', () => {
    it('returns the numeric value', () => {
      const r = OverallRating.fromValues(3, 4, 5, 3, 4);
      expect(r.toNumber()).toBe(r.value);
    });
  });
});

// ── ProfessionalResponse ──────────────────────────────────────────────────────

describe('ProfessionalResponse', () => {
  it('creates a valid response', () => {
    const result = ProfessionalResponse.create('Thank you for your feedback!');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe('Thank you for your feedback!');
    }
  });

  it('trims whitespace', () => {
    const result = ProfessionalResponse.create('  Great feedback  ');
    if (result.isRight()) {
      expect(result.value.value).toBe('Great feedback');
    }
  });

  it('returns Left<InvalidCommentError> for blank response', () => {
    const result = ProfessionalResponse.create('   ');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_COMMENT);
    }
  });

  it('returns Left<InvalidCommentError> for response shorter than 10 chars', () => {
    const result = ProfessionalResponse.create('Short');
    expect(result.isLeft()).toBe(true);
  });

  it('returns Left<InvalidCommentError> for response longer than 500 chars', () => {
    const result = ProfessionalResponse.create('x'.repeat(501));
    expect(result.isLeft()).toBe(true);
  });

  it('accepts exactly 10 characters', () => {
    expect(ProfessionalResponse.create('1234567890').isRight()).toBe(true);
  });

  it('accepts exactly 500 characters', () => {
    expect(ProfessionalResponse.create('x'.repeat(500)).isRight()).toBe(true);
  });

  it('equals returns true for same value', () => {
    const a = ProfessionalResponse.create('Same response text.').value as ProfessionalResponse;
    const b = ProfessionalResponse.create('Same response text.').value as ProfessionalResponse;
    expect(a.equals(b)).toBe(true);
  });
});

// ── RecommendationRate ─────────────────────────────────────────────────────────

describe('RecommendationRate', () => {
  it('calculates 100% when all recommend', () => {
    const rate = RecommendationRate.calculate(10, 10);
    expect(rate.value).toBe(100.0);
  });

  it('calculates 50% for half recommending', () => {
    const rate = RecommendationRate.calculate(1, 2);
    expect(rate.value).toBe(50.0);
  });

  it('returns 0 when totalReviews is 0', () => {
    const rate = RecommendationRate.calculate(0, 0);
    expect(rate.value).toBe(0);
  });

  it('zero() returns 0', () => {
    const rate = RecommendationRate.zero();
    expect(rate.value).toBe(0);
  });

  it('clamps to 0 minimum', () => {
    const rate = RecommendationRate.calculate(0, 10);
    expect(rate.value).toBeGreaterThanOrEqual(0);
  });

  it('clamps to 100 maximum', () => {
    const rate = RecommendationRate.calculate(10, 10);
    expect(rate.value).toBeLessThanOrEqual(100);
  });

  it('rounds to 1 decimal place', () => {
    // 1/3 = 33.333...%
    const rate = RecommendationRate.calculate(1, 3);
    expect(rate.value).toBe(33.3);
  });

  it('equals returns true for same value', () => {
    const a = RecommendationRate.calculate(5, 10);
    const b = RecommendationRate.calculate(5, 10);
    expect(a.equals(b)).toBe(true);
  });
});

// ── VerifiedInteraction ────────────────────────────────────────────────────────

describe('VerifiedInteraction', () => {
  it('verified() always returns true', () => {
    const vi = VerifiedInteraction.verified();
    expect(vi.isVerified()).toBe(true);
    expect(vi.value).toBe(true);
  });

  it('equals returns true for two verified interactions', () => {
    const a = VerifiedInteraction.verified();
    const b = VerifiedInteraction.verified();
    expect(a.equals(b)).toBe(true);
  });
});
