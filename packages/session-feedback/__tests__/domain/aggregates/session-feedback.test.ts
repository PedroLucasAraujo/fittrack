import { describe, it, expect } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { SessionFeedback } from '../../../domain/aggregates/session-feedback.js';
import { SessionRating } from '../../../domain/value-objects/session-rating.js';
import { FeedbackComment } from '../../../domain/value-objects/feedback-comment.js';
import { FeedbackFlagReason } from '../../../domain/value-objects/feedback-flag-reason.js';

function makeRating(value: 1 | 2 | 3 | 4 | 5): SessionRating {
  return (SessionRating.create(value) as { value: SessionRating }).value;
}

function makeComment(text: string): FeedbackComment {
  return (FeedbackComment.create(text) as { value: FeedbackComment }).value;
}

function makeFlagReason(reason: string): FeedbackFlagReason {
  return (FeedbackFlagReason.create(reason) as { value: FeedbackFlagReason }).value;
}

function buildFeedback(
  overrides: {
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
  } = {},
) {
  const result = SessionFeedback.create({
    professionalProfileId: 'prof-123',
    clientId: 'client-456',
    bookingId: 'booking-789',
    rating: makeRating(overrides.rating ?? 5),
    comment: overrides.comment ? makeComment(overrides.comment) : null,
    sessionDate: '2025-01-15',
    submittedAtUtc: UTCDateTime.now(),
  });
  if (result.isLeft()) throw new Error('Failed to create feedback: ' + result.value.message);
  return result.value;
}

describe('SessionFeedback', () => {
  describe('create()', () => {
    it('creates a valid feedback with minimal props', () => {
      const feedback = buildFeedback();
      expect(feedback.professionalProfileId).toBe('prof-123');
      expect(feedback.clientId).toBe('client-456');
      expect(feedback.bookingId).toBe('booking-789');
      expect(feedback.rating.toNumber()).toBe(5);
      expect(feedback.comment).toBeNull();
      expect(feedback.sessionDate).toBe('2025-01-15');
    });

    it('creates a feedback with a comment', () => {
      const feedback = buildFeedback({ comment: 'Excellent session, very professional!' });
      expect(feedback.comment).not.toBeNull();
      expect(feedback.comment?.value).toBe('Excellent session, very professional!');
    });

    it('starts unflagged and visible', () => {
      const feedback = buildFeedback();
      expect(feedback.isFlagged()).toBe(false);
      expect(feedback.isHidden()).toBe(false);
      expect(feedback.isVisible()).toBe(true);
      expect(feedback.flaggedAtUtc).toBeNull();
      expect(feedback.hiddenAtUtc).toBeNull();
      expect(feedback.flagReason).toBeNull();
    });

    it('starts not reviewed by professional', () => {
      const feedback = buildFeedback();
      expect(feedback.hasBeenReviewed()).toBe(false);
      expect(feedback.reviewedAtUtc).toBeNull();
      expect(feedback.reviewedByProfessional).toBe(false);
    });

    it('generates an id when none is provided', () => {
      const feedback = buildFeedback();
      expect(feedback.id).toBeTruthy();
      expect(feedback.id.length).toBeGreaterThan(0);
    });

    it('uses provided id when given', () => {
      const result = SessionFeedback.create({
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        professionalProfileId: 'prof-123',
        clientId: 'client-456',
        bookingId: 'booking-789',
        rating: makeRating(3),
        comment: null,
        sessionDate: '2025-01-15',
        submittedAtUtc: UTCDateTime.now(),
      });
      expect(result.isRight()).toBe(true);
    });

    it('rejects empty professionalProfileId', () => {
      const result = SessionFeedback.create({
        professionalProfileId: '',
        clientId: 'client-456',
        bookingId: 'booking-789',
        rating: makeRating(5),
        comment: null,
        sessionDate: '2025-01-15',
        submittedAtUtc: UTCDateTime.now(),
      });
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty clientId', () => {
      const result = SessionFeedback.create({
        professionalProfileId: 'prof-123',
        clientId: '',
        bookingId: 'booking-789',
        rating: makeRating(5),
        comment: null,
        sessionDate: '2025-01-15',
        submittedAtUtc: UTCDateTime.now(),
      });
      expect(result.isLeft()).toBe(true);
    });

    it('rejects empty bookingId', () => {
      const result = SessionFeedback.create({
        professionalProfileId: 'prof-123',
        clientId: 'client-456',
        bookingId: '',
        rating: makeRating(5),
        comment: null,
        sessionDate: '2025-01-15',
        submittedAtUtc: UTCDateTime.now(),
      });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('isNegative / isNeutral / isPositive', () => {
    it('rating 1 → isNegative', () => {
      const f = buildFeedback({ rating: 1 });
      expect(f.isNegative()).toBe(true);
      expect(f.isNeutral()).toBe(false);
      expect(f.isPositive()).toBe(false);
    });

    it('rating 2 → isNegative', () => {
      const f = buildFeedback({ rating: 2 });
      expect(f.isNegative()).toBe(true);
    });

    it('rating 3 → isNeutral', () => {
      const f = buildFeedback({ rating: 3 });
      expect(f.isNeutral()).toBe(true);
      expect(f.isNegative()).toBe(false);
      expect(f.isPositive()).toBe(false);
    });

    it('rating 4 → isPositive', () => {
      const f = buildFeedback({ rating: 4 });
      expect(f.isPositive()).toBe(true);
      expect(f.isNegative()).toBe(false);
    });

    it('rating 5 → isPositive', () => {
      const f = buildFeedback({ rating: 5 });
      expect(f.isPositive()).toBe(true);
    });
  });

  describe('flag()', () => {
    it('marks feedback as flagged', () => {
      const feedback = buildFeedback();
      const reason = makeFlagReason('This feedback contains offensive language.');

      const result = feedback.flag(reason);

      expect(result.isRight()).toBe(true);
      expect(feedback.isFlagged()).toBe(true);
      expect(feedback.flaggedAtUtc).not.toBeNull();
      expect(feedback.flagReason?.value).toBe('This feedback contains offensive language.');
    });

    it('returns the flaggedAtUtc timestamp', () => {
      const feedback = buildFeedback();
      const reason = makeFlagReason('Abusive and offensive content.');
      const result = feedback.flag(reason);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value).toBeTruthy();
      }
    });

    it('rejects double-flagging', () => {
      const feedback = buildFeedback();
      const reason = makeFlagReason('Abusive and offensive content.');

      feedback.flag(reason);
      const secondFlag = feedback.flag(reason);

      expect(secondFlag.isLeft()).toBe(true);
    });
  });

  describe('hide()', () => {
    it('marks feedback as hidden', () => {
      const feedback = buildFeedback();

      const result = feedback.hide();

      expect(result.isRight()).toBe(true);
      expect(feedback.isHidden()).toBe(true);
      expect(feedback.isVisible()).toBe(false);
      expect(feedback.hiddenAtUtc).not.toBeNull();
    });

    it('returns the hiddenAtUtc timestamp', () => {
      const feedback = buildFeedback();
      const result = feedback.hide();
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value).toBeTruthy();
      }
    });

    it('rejects double-hiding', () => {
      const feedback = buildFeedback();
      feedback.hide();
      const secondHide = feedback.hide();
      expect(secondHide.isLeft()).toBe(true);
    });

    it('allows flagging a hidden feedback (independent operations)', () => {
      const feedback = buildFeedback();
      feedback.hide();
      const reason = makeFlagReason('Contains abusive content worth noting.');
      const flagResult = feedback.flag(reason);
      expect(flagResult.isRight()).toBe(true);
    });
  });

  describe('markReviewedByProfessional()', () => {
    it('sets reviewedByProfessional to true and returns right', () => {
      const feedback = buildFeedback();
      expect(feedback.hasBeenReviewed()).toBe(false);

      const result = feedback.markReviewedByProfessional();

      expect(result.isRight()).toBe(true);
      expect(feedback.hasBeenReviewed()).toBe(true);
      expect(feedback.reviewedAtUtc).not.toBeNull();
    });

    it('is idempotent — calling twice has no side effect and returns right both times', () => {
      const feedback = buildFeedback();
      feedback.markReviewedByProfessional();
      const firstReviewedAt = feedback.reviewedAtUtc;

      const secondResult = feedback.markReviewedByProfessional();

      expect(secondResult.isRight()).toBe(true);
      expect(feedback.reviewedAtUtc).toBe(firstReviewedAt);
    });
  });

  describe('reconstitute()', () => {
    it('reconstitutes from persistence props', () => {
      const original = buildFeedback({
        rating: 2,
        comment: 'Not great at all, needs improvement.',
      });
      const reconstructed = SessionFeedback.reconstitute(
        original.id,
        {
          professionalProfileId: original.professionalProfileId,
          clientId: original.clientId,
          bookingId: original.bookingId,
          rating: original.rating,
          comment: original.comment,
          sessionDate: original.sessionDate,
          submittedAtUtc: original.submittedAtUtc,
          flaggedAtUtc: null,
          flagReason: null,
          hiddenAtUtc: null,
          reviewedByProfessional: false,
          reviewedAtUtc: null,
        },
        1,
      );

      expect(reconstructed.id).toBe(original.id);
      expect(reconstructed.rating.toNumber()).toBe(2);
      expect(reconstructed.isNegative()).toBe(true);
    });
  });
});
