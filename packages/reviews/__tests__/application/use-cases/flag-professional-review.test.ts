import { describe, it, expect, beforeEach } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { FlagProfessionalReview } from '../../../application/use-cases/flag-professional-review.js';
import { InMemoryReviewRepository } from '../stubs/in-memory-review-repository.js';
import { InMemoryEventPublisher } from '../stubs/in-memory-event-publisher.js';
import { ProfessionalReview } from '../../../domain/aggregates/professional-review.js';
import { Ratings } from '../../../domain/value-objects/ratings.js';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { VerifiedInteraction } from '../../../domain/value-objects/verified-interaction.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

function makeReview(professionalProfileId = 'prof-123'): ProfessionalReview {
  const ratings = Ratings.create({
    professionalism: 4,
    communication: 5,
    technicalKnowledge: 4,
    punctuality: 5,
    results: 4,
  }).value as Ratings;
  const result = ProfessionalReview.create({
    professionalProfileId,
    clientId: 'client-456',
    ratings,
    overallRating: ratings.calculateOverall(),
    wouldRecommend: true,
    comment: null,
    verifiedInteraction: VerifiedInteraction.verified(),
    sessionCountAtReview: SessionCount.create(10).value as SessionCount,
    createdAtUtc: UTCDateTime.now(),
  });
  if (result.isLeft()) throw new Error(result.value.message);
  return result.value;
}

describe('FlagProfessionalReview', () => {
  let sut: FlagProfessionalReview;
  let reviewRepo: InMemoryReviewRepository;
  let eventPublisher: InMemoryEventPublisher;
  let review: ProfessionalReview;

  beforeEach(async () => {
    reviewRepo = new InMemoryReviewRepository();
    eventPublisher = new InMemoryEventPublisher();
    sut = new FlagProfessionalReview(reviewRepo, eventPublisher);
    review = makeReview('prof-123');
    await reviewRepo.save(review);
  });

  it('flags a review when called by the reviewed professional', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'Contains false information.',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.reviewId).toBe(review.id);
      expect(result.value.flaggedAtUtc).toBeTruthy();
    }
  });

  it('flags a review when called by an admin (different id)', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      flaggedBy: 'admin-999',
      reason: 'Spam content suspected.',
    });

    expect(result.isRight()).toBe(true);
  });

  it('persists the flag on the review', async () => {
    await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'Contains false information.',
    });

    const updated = await reviewRepo.findById(review.id);
    expect(updated?.isFlagged()).toBe(true);
    expect(updated?.flagReason?.value).toBe('Contains false information.');
  });

  it('review remains visible after flagging', async () => {
    await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'Contains false information.',
    });

    const updated = await reviewRepo.findById(review.id);
    expect(updated?.isVisible()).toBe(true);
  });

  it('publishes ProfessionalReviewFlaggedEvent', async () => {
    await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'Contains false information.',
    });

    expect(eventPublisher.flaggedEvents).toHaveLength(1);
    expect(eventPublisher.flaggedEvents[0]!.payload.flaggedBy).toBe('prof-123');
    expect(eventPublisher.flaggedEvents[0]!.payload.reason).toBe('Contains false information.');
  });

  it('returns Left<ReviewNotFoundError> for unknown reviewId', async () => {
    const result = await sut.execute({
      reviewId: 'non-existent',
      flaggedBy: 'prof-123',
      reason: 'Some valid reason.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.REVIEW_NOT_FOUND);
    }
  });

  it('returns Left<ReviewAlreadyFlaggedError> when already flagged', async () => {
    await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'First flag reason.',
    });

    const result = await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'Second flag attempt.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.REVIEW_ALREADY_FLAGGED);
    }
  });

  it('returns Left<InvalidCommentError> for reason shorter than 5 chars', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      flaggedBy: 'prof-123',
      reason: 'No',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_COMMENT);
    }
  });

  it('returns Left<UnauthorizedReviewActionError> for empty flaggedBy', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      flaggedBy: '',
      reason: 'Contains false information.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.UNAUTHORIZED_REVIEW_ACTION);
    }
  });

  it('returns Left<UnauthorizedReviewActionError> for whitespace-only flaggedBy', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      flaggedBy: '   ',
      reason: 'Contains false information.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.UNAUTHORIZED_REVIEW_ACTION);
    }
  });
});
