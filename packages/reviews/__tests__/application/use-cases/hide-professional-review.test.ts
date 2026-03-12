import { describe, it, expect, beforeEach } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { HideProfessionalReview } from '../../../application/use-cases/hide-professional-review.js';
import { InMemoryReviewRepository } from '../stubs/in-memory-review-repository.js';
import { InMemoryEventPublisher } from '../stubs/in-memory-event-publisher.js';
import { ProfessionalReview } from '../../../domain/aggregates/professional-review.js';
import { Ratings } from '../../../domain/value-objects/ratings.js';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { VerifiedInteraction } from '../../../domain/value-objects/verified-interaction.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

function makeReview(): ProfessionalReview {
  const ratings = Ratings.create({
    professionalism: 4,
    communication: 5,
    technicalKnowledge: 4,
    punctuality: 5,
    results: 4,
  }).value as Ratings;

  const result = ProfessionalReview.create({
    professionalProfileId: 'prof-123',
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

describe('HideProfessionalReview', () => {
  let sut: HideProfessionalReview;
  let reviewRepo: InMemoryReviewRepository;
  let eventPublisher: InMemoryEventPublisher;
  let review: ProfessionalReview;

  beforeEach(async () => {
    reviewRepo = new InMemoryReviewRepository();
    eventPublisher = new InMemoryEventPublisher();
    sut = new HideProfessionalReview(reviewRepo, eventPublisher);
    review = makeReview();
    await reviewRepo.save(review);
  });

  it('hides review when called by admin', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      hiddenBy: 'admin-001',
      isAdmin: true,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.reviewId).toBe(review.id);
      expect(result.value.hiddenAtUtc).toBeTruthy();
    }
  });

  it('makes review invisible after hiding', async () => {
    await sut.execute({ reviewId: review.id, hiddenBy: 'admin-001', isAdmin: true });

    const updated = await reviewRepo.findById(review.id);
    expect(updated?.isHidden()).toBe(true);
    expect(updated?.isVisible()).toBe(false);
  });

  it('publishes ProfessionalReviewHiddenEvent', async () => {
    await sut.execute({ reviewId: review.id, hiddenBy: 'admin-001', isAdmin: true });

    expect(eventPublisher.hiddenEvents).toHaveLength(1);
    expect(eventPublisher.hiddenEvents[0]!.payload.hiddenBy).toBe('admin-001');
  });

  it('returns Left<UnauthorizedReviewActionError> when not admin', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      hiddenBy: 'prof-123',
      isAdmin: false,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.UNAUTHORIZED_REVIEW_ACTION);
    }
    expect(reviewRepo.items[0]!.isVisible()).toBe(true);
  });

  it('returns Left<ReviewNotFoundError> for unknown reviewId', async () => {
    const result = await sut.execute({
      reviewId: 'unknown-id',
      hiddenBy: 'admin-001',
      isAdmin: true,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.REVIEW_NOT_FOUND);
    }
  });

  it('returns Left<InvalidReviewError> when review is already hidden', async () => {
    await sut.execute({ reviewId: review.id, hiddenBy: 'admin-001', isAdmin: true });

    const result = await sut.execute({ reviewId: review.id, hiddenBy: 'admin-001', isAdmin: true });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
    }
  });
});
