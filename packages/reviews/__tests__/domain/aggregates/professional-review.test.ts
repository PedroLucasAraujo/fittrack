import { describe, it, expect } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { ProfessionalReview } from '../../../domain/aggregates/professional-review.js';
import { Ratings } from '../../../domain/value-objects/ratings.js';
import { ReviewComment } from '../../../domain/value-objects/review-comment.js';
import { ProfessionalResponse } from '../../../domain/value-objects/professional-response.js';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { VerifiedInteraction } from '../../../domain/value-objects/verified-interaction.js';
import { FlagReason } from '../../../domain/value-objects/flag-reason.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

// ── Test factory ──────────────────────────────────────────────────────────────

function makeValidRatings(): Ratings {
  return Ratings.create({
    professionalism: 4,
    communication: 5,
    technicalKnowledge: 4,
    punctuality: 5,
    results: 4,
  }).value as Ratings;
}

function makeReview(
  overrides: {
    professionalProfileId?: string;
    clientId?: string;
    comment?: string | null;
    wouldRecommend?: boolean;
  } = {},
): ProfessionalReview {
  const ratings = makeValidRatings();
  const overallRating = ratings.calculateOverall();
  const sessionCount = SessionCount.create(10).value as SessionCount;

  const result = ProfessionalReview.create({
    professionalProfileId: overrides.professionalProfileId ?? 'prof-123',
    clientId: overrides.clientId ?? 'client-456',
    ratings,
    overallRating,
    wouldRecommend: overrides.wouldRecommend ?? true,
    comment:
      overrides.comment !== undefined
        ? overrides.comment
          ? (ReviewComment.create(overrides.comment).value as ReviewComment)
          : null
        : null,
    verifiedInteraction: VerifiedInteraction.verified(),
    sessionCountAtReview: sessionCount,
    createdAtUtc: UTCDateTime.now(),
  });

  if (result.isLeft()) throw new Error(`Factory failed: ${result.value.message}`);
  return result.value;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ProfessionalReview', () => {
  describe('create()', () => {
    it('creates a review with correct initial state', () => {
      const review = makeReview();

      expect(review.professionalProfileId).toBe('prof-123');
      expect(review.clientId).toBe('client-456');
      expect(review.overallRating.value).toBe(4.4); // (4+5+4+5+4)/5 = 22/5 = 4.4
      expect(review.wouldRecommend).toBe(true);
      expect(review.comment).toBeNull();
      expect(review.professionalResponse).toBeNull();
      expect(review.respondedAtUtc).toBeNull();
      expect(review.flaggedAtUtc).toBeNull();
      expect(review.flagReason).toBeNull();
      expect(review.hiddenAtUtc).toBeNull();
      expect(review.verifiedInteraction.isVerified()).toBe(true);
      expect(review.sessionCountAtReview.value).toBe(10);
    });

    it('starts with all boolean state false (not flagged, not hidden)', () => {
      const review = makeReview();

      expect(review.isFlagged()).toBe(false);
      expect(review.isHidden()).toBe(false);
      expect(review.isVisible()).toBe(true);
      expect(review.hasProfessionalResponse()).toBe(false);
    });

    it('accepts a comment', () => {
      const review = makeReview({ comment: 'Great professional, very knowledgeable.' });
      expect(review.comment?.value).toBe('Great professional, very knowledgeable.');
    });

    it('returns Left<InvalidReviewError> for empty professionalProfileId', () => {
      const ratings = makeValidRatings();
      const result = ProfessionalReview.create({
        professionalProfileId: '',
        clientId: 'client-456',
        ratings,
        overallRating: ratings.calculateOverall(),
        wouldRecommend: true,
        comment: null,
        verifiedInteraction: VerifiedInteraction.verified(),
        sessionCountAtReview: SessionCount.create(10).value as SessionCount,
        createdAtUtc: UTCDateTime.now(),
      });
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
      }
    });

    it('returns Left<InvalidReviewError> for empty clientId', () => {
      const ratings = makeValidRatings();
      const result = ProfessionalReview.create({
        professionalProfileId: 'prof-123',
        clientId: '',
        ratings,
        overallRating: ratings.calculateOverall(),
        wouldRecommend: true,
        comment: null,
        verifiedInteraction: VerifiedInteraction.verified(),
        sessionCountAtReview: SessionCount.create(10).value as SessionCount,
        createdAtUtc: UTCDateTime.now(),
      });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('respond()', () => {
    it('sets professionalResponse and respondedAtUtc on first call', () => {
      const review = makeReview();
      const response = ProfessionalResponse.create('Thank you for your feedback!')
        .value as ProfessionalResponse;

      const result = review.respond(response);

      expect(result.isRight()).toBe(true);
      expect(review.hasProfessionalResponse()).toBe(true);
      expect(review.professionalResponse?.value).toBe('Thank you for your feedback!');
      expect(review.respondedAtUtc).not.toBeNull();
    });

    it('returns Left<ReviewAlreadyRespondedError> when called twice', () => {
      const review = makeReview();
      const response = ProfessionalResponse.create('First response here.')
        .value as ProfessionalResponse;

      review.respond(response);
      const secondResult = review.respond(response);

      expect(secondResult.isLeft()).toBe(true);
      if (secondResult.isLeft()) {
        expect(secondResult.value.code).toBe(ReviewErrorCodes.REVIEW_ALREADY_RESPONDED);
      }
    });
  });

  describe('updateResponse()', () => {
    it('overwrites existing response and updates respondedAtUtc', () => {
      const review = makeReview();
      const first = ProfessionalResponse.create('First response here.')
        .value as ProfessionalResponse;
      const second = ProfessionalResponse.create('Updated response text.')
        .value as ProfessionalResponse;

      review.respond(first);
      const updateResult = review.updateResponse(second);

      expect(updateResult.isRight()).toBe(true);
      expect(review.professionalResponse?.value).toBe('Updated response text.');
    });

    it('returns Left<InvalidReviewError> when called without a prior respond()', () => {
      const review = makeReview();
      const response = ProfessionalResponse.create('No prior response.')
        .value as ProfessionalResponse;

      const result = review.updateResponse(response);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
      }
    });
  });

  describe('flag()', () => {
    it('sets flaggedAtUtc and flagReason', () => {
      const review = makeReview();
      const reason = FlagReason.create('Contains inappropriate language.').value as FlagReason;

      const result = review.flag(reason);

      expect(result.isRight()).toBe(true);
      expect(review.isFlagged()).toBe(true);
      expect(review.flaggedAtUtc).not.toBeNull();
      expect(review.flagReason?.value).toBe('Contains inappropriate language.');
    });

    it('returns Left<ReviewAlreadyFlaggedError> when already flagged', () => {
      const review = makeReview();
      const reason = FlagReason.create('Spam content detected.').value as FlagReason;

      review.flag(reason);
      const secondResult = review.flag(reason);

      expect(secondResult.isLeft()).toBe(true);
      if (secondResult.isLeft()) {
        expect(secondResult.value.code).toBe(ReviewErrorCodes.REVIEW_ALREADY_FLAGGED);
      }
    });

    it('flagged review remains visible', () => {
      const review = makeReview();
      const reason = FlagReason.create('Spam content detected.').value as FlagReason;

      review.flag(reason);

      expect(review.isVisible()).toBe(true);
      expect(review.isHidden()).toBe(false);
    });
  });

  describe('hide()', () => {
    it('sets hiddenAtUtc and makes review invisible', () => {
      const review = makeReview();

      const result = review.hide();

      expect(result.isRight()).toBe(true);
      expect(review.isHidden()).toBe(true);
      expect(review.isVisible()).toBe(false);
      expect(review.hiddenAtUtc).not.toBeNull();
    });

    it('returns Left<InvalidReviewError> when already hidden', () => {
      const review = makeReview();

      review.hide();
      const secondResult = review.hide();

      expect(secondResult.isLeft()).toBe(true);
      if (secondResult.isLeft()) {
        expect(secondResult.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
      }
    });
  });

  describe('reconstitute()', () => {
    it('reconstructs aggregate from props without re-validating', () => {
      const original = makeReview();
      const props = {
        professionalProfileId: original.professionalProfileId,
        clientId: original.clientId,
        ratings: original.ratings,
        overallRating: original.overallRating,
        wouldRecommend: original.wouldRecommend,
        comment: original.comment,
        professionalResponse: null,
        respondedAtUtc: null,
        createdAtUtc: original.createdAtUtc,
        flaggedAtUtc: null,
        flagReason: null,
        hiddenAtUtc: null,
        verifiedInteraction: original.verifiedInteraction,
        sessionCountAtReview: original.sessionCountAtReview,
      };

      const reconstituted = ProfessionalReview.reconstitute(original.id, props, 1);

      expect(reconstituted.id).toBe(original.id);
      expect(reconstituted.professionalProfileId).toBe(original.professionalProfileId);
      expect(reconstituted.version).toBe(1);
    });
  });
});
