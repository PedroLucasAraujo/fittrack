import { describe, it, expect, beforeEach } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { RespondToProfessionalReview } from '../../../application/use-cases/respond-to-professional-review.js';
import { InMemoryReviewRepository } from '../stubs/in-memory-review-repository.js';
import { InMemoryEventPublisher } from '../stubs/in-memory-event-publisher.js';
import { ProfessionalReview } from '../../../domain/aggregates/professional-review.js';
import { Ratings } from '../../../domain/value-objects/ratings.js';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { VerifiedInteraction } from '../../../domain/value-objects/verified-interaction.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';

function makeReview(
  professionalProfileId = 'prof-123',
  clientId = 'client-456',
): ProfessionalReview {
  const ratings = Ratings.create({
    professionalism: 4,
    communication: 5,
    technicalKnowledge: 4,
    punctuality: 5,
    results: 4,
  }).value as Ratings;

  const result = ProfessionalReview.create({
    professionalProfileId,
    clientId,
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

describe('RespondToProfessionalReview', () => {
  let sut: RespondToProfessionalReview;
  let reviewRepo: InMemoryReviewRepository;
  let eventPublisher: InMemoryEventPublisher;
  let review: ProfessionalReview;

  beforeEach(async () => {
    reviewRepo = new InMemoryReviewRepository();
    eventPublisher = new InMemoryEventPublisher();
    sut = new RespondToProfessionalReview(reviewRepo, eventPublisher);

    review = makeReview('prof-123');
    await reviewRepo.save(review);
  });

  it('records professional response and returns DTO', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'prof-123',
      response: 'Thank you for your feedback!',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.reviewId).toBe(review.id);
      expect(result.value.respondedAtUtc).toBeTruthy();
    }
  });

  it('persists the response on the review', async () => {
    await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'prof-123',
      response: 'Thank you for your great review!',
    });

    const updated = await reviewRepo.findById(review.id);
    expect(updated?.hasProfessionalResponse()).toBe(true);
    expect(updated?.professionalResponse?.value).toBe('Thank you for your great review!');
  });

  it('publishes ProfessionalReviewRespondedEvent', async () => {
    await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'prof-123',
      response: 'We appreciate your feedback.',
    });

    expect(eventPublisher.respondedEvents).toHaveLength(1);
  });

  it('updates existing response when called again', async () => {
    await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'prof-123',
      response: 'First response text here.',
    });

    const result = await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'prof-123',
      response: 'Updated response text here.',
    });

    expect(result.isRight()).toBe(true);
    const updated = await reviewRepo.findById(review.id);
    expect(updated?.professionalResponse?.value).toBe('Updated response text here.');
  });

  it('returns Left<ReviewNotFoundError> for unknown reviewId', async () => {
    const result = await sut.execute({
      reviewId: 'non-existent',
      professionalProfileId: 'prof-123',
      response: 'This should fail gracefully.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.REVIEW_NOT_FOUND);
    }
  });

  it('returns Left<ReviewNotFoundError> when professionalProfileId does not match (ADR-0025: 404 not 403)', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'wrong-prof-999',
      response: 'Cross-tenant response attempt.',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.REVIEW_NOT_FOUND);
    }
  });

  it('returns Left<InvalidCommentError> for response shorter than 10 chars', async () => {
    const result = await sut.execute({
      reviewId: review.id,
      professionalProfileId: 'prof-123',
      response: 'Short',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_COMMENT);
    }
  });
});
