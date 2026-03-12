import { describe, it, expect, beforeEach } from 'vitest';
import { UTCDateTime } from '@fittrack/core';
import { GetProfessionalReviews } from '../../../application/use-cases/get-professional-reviews.js';
import { GetClientReviews } from '../../../application/use-cases/get-client-reviews.js';
import { GetProfessionalReputationScore } from '../../../application/use-cases/get-professional-reputation-score.js';
import { InMemoryReviewRepository } from '../stubs/in-memory-review-repository.js';
import { InMemoryReputationRepository } from '../stubs/in-memory-reputation-repository.js';
import { ProfessionalReview } from '../../../domain/aggregates/professional-review.js';
import { Ratings } from '../../../domain/value-objects/ratings.js';
import { SessionCount } from '../../../domain/value-objects/session-count.js';
import { VerifiedInteraction } from '../../../domain/value-objects/verified-interaction.js';
import { ReviewErrorCodes } from '../../../domain/errors/review-error-codes.js';
import { ReviewComment } from '../../../domain/value-objects/review-comment.js';
import { ProfessionalResponse } from '../../../domain/value-objects/professional-response.js';

function makeReview(
  professionalProfileId = 'prof-123',
  clientId = 'client-456',
  withComment = true,
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
    comment: withComment
      ? (ReviewComment.create('Great professional service!').value as ReviewComment)
      : null,
    verifiedInteraction: VerifiedInteraction.verified(),
    sessionCountAtReview: SessionCount.create(10).value as SessionCount,
    createdAtUtc: UTCDateTime.now(),
  });
  if (result.isLeft()) throw new Error(result.value.message);
  return result.value;
}

describe('GetProfessionalReviews', () => {
  let sut: GetProfessionalReviews;
  let reviewRepo: InMemoryReviewRepository;

  beforeEach(() => {
    reviewRepo = new InMemoryReviewRepository();
    sut = new GetProfessionalReviews(reviewRepo);
  });

  it('returns visible reviews for a professional', async () => {
    const r1 = makeReview('prof-123', 'client-1');
    const r2 = makeReview('prof-123', 'client-2');
    await reviewRepo.save(r1);
    await reviewRepo.save(r2);

    const result = await sut.execute({ professionalProfileId: 'prof-123' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
      expect(result.value.reviews[0]!.clientLabel).toBe('Verified Client');
    }
  });

  it('excludes hidden reviews by default', async () => {
    const r1 = makeReview('prof-123', 'client-1');
    const r2 = makeReview('prof-123', 'client-2');
    r1.hide();
    await reviewRepo.save(r1);
    await reviewRepo.save(r2);

    const result = await sut.execute({ professionalProfileId: 'prof-123' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
    }
  });

  it('includes hidden reviews when includeHidden=true', async () => {
    const r1 = makeReview('prof-123', 'client-1');
    r1.hide();
    await reviewRepo.save(r1);

    const result = await sut.execute({ professionalProfileId: 'prof-123', includeHidden: true });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
      expect(result.value.reviews[0]!.isHidden).toBe(true);
    }
  });

  it('returns Left<InvalidReviewError> for empty professionalProfileId', async () => {
    const result = await sut.execute({ professionalProfileId: '' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
    }
  });

  it('maps review fields correctly in DTO', async () => {
    const r = makeReview('prof-123');
    await reviewRepo.save(r);

    const result = await sut.execute({ professionalProfileId: 'prof-123' });

    if (result.isRight()) {
      const dto = result.value.reviews[0]!;
      expect(dto.overallRating).toBe(4.4);
      expect(dto.wouldRecommend).toBe(true);
      expect(dto.comment).toBe('Great professional service!');
      expect(dto.isFlagged).toBe(false);
      expect(dto.isHidden).toBe(false);
      expect(dto.professionalResponse).toBeNull();
    }
  });

  it('maps null comment correctly in DTO', async () => {
    const r = makeReview('prof-123', 'client-456', false); // no comment
    await reviewRepo.save(r);

    const result = await sut.execute({ professionalProfileId: 'prof-123' });

    if (result.isRight()) {
      expect(result.value.reviews[0]!.comment).toBeNull();
    }
  });

  it('maps professionalResponse and respondedAtUtc correctly when responded', async () => {
    const r = makeReview('prof-123');
    const response = ProfessionalResponse.create('Thank you for the kind review!')
      .value as ProfessionalResponse;
    r.respond(response);
    await reviewRepo.save(r);

    const result = await sut.execute({ professionalProfileId: 'prof-123' });

    if (result.isRight()) {
      const dto = result.value.reviews[0]!;
      expect(dto.professionalResponse).toBe('Thank you for the kind review!');
      expect(dto.respondedAtUtc).not.toBeNull();
    }
  });
});

describe('GetClientReviews', () => {
  let sut: GetClientReviews;
  let reviewRepo: InMemoryReviewRepository;

  beforeEach(() => {
    reviewRepo = new InMemoryReviewRepository();
    sut = new GetClientReviews(reviewRepo);
  });

  it('returns visible reviews for a client', async () => {
    const r1 = makeReview('prof-1', 'client-abc');
    const r2 = makeReview('prof-2', 'client-abc');
    await reviewRepo.save(r1);
    await reviewRepo.save(r2);

    const result = await sut.execute({ clientId: 'client-abc' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
      expect(result.value.clientId).toBe('client-abc');
    }
  });

  it('filters out hidden reviews', async () => {
    const r1 = makeReview('prof-1', 'client-abc');
    const r2 = makeReview('prof-2', 'client-abc');
    r1.hide();
    await reviewRepo.save(r1);
    await reviewRepo.save(r2);

    const result = await sut.execute({ clientId: 'client-abc' });

    if (result.isRight()) {
      expect(result.value.total).toBe(1);
    }
  });

  it('maps null comment correctly', async () => {
    const r = makeReview('prof-1', 'client-abc', false); // no comment
    await reviewRepo.save(r);

    const result = await sut.execute({ clientId: 'client-abc' });

    if (result.isRight()) {
      expect(result.value.reviews[0]!.comment).toBeNull();
    }
  });

  it('returns Left<InvalidReviewError> for empty clientId', async () => {
    const result = await sut.execute({ clientId: '' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
    }
  });

  it('returns Left<InvalidReviewError> for whitespace-only clientId', async () => {
    const result = await sut.execute({ clientId: '   ' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
    }
  });
});

describe('GetProfessionalReputationScore', () => {
  let sut: GetProfessionalReputationScore;
  let reputationRepo: InMemoryReputationRepository;

  beforeEach(() => {
    reputationRepo = new InMemoryReputationRepository();
    sut = new GetProfessionalReputationScore(reputationRepo);
  });

  it('returns zero DTO when no reputation record exists', async () => {
    const result = await sut.execute({ professionalProfileId: 'prof-new' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.totalReviews).toBe(0);
      expect(result.value.overallScore).toBe(0);
      expect(result.value.recommendationRate).toBe(0);
      expect(result.value.lastUpdatedAt).toBeNull();
    }
  });

  it('returns reputation DTO when record exists', async () => {
    const { ProfessionalReputationScore } = await import(
      '../../../application/projections/professional-reputation-score.js'
    );
    const reputation = ProfessionalReputationScore.createEmpty('prof-123');
    reputation.addReview({
      professionalism: 5,
      communication: 5,
      technicalKnowledge: 5,
      punctuality: 5,
      results: 5,
      overallRating: 5.0,
      wouldRecommend: true,
    });
    await reputationRepo.save(reputation);

    const result = await sut.execute({ professionalProfileId: 'prof-123' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.totalReviews).toBe(1);
      expect(result.value.averageProfessionalism).toBe(5);
      expect(result.value.lastUpdatedAt).not.toBeNull();
    }
  });

  it('returns null lastUpdatedAt when reputation has no reviews yet (reconstituted empty)', async () => {
    const { ProfessionalReputationScore } = await import(
      '../../../application/projections/professional-reputation-score.js'
    );
    // Reconstitute with lastUpdatedAt = null (freshly created, no reviews added)
    const reputation = ProfessionalReputationScore.createEmpty('prof-empty');
    await reputationRepo.save(reputation);

    const result = await sut.execute({ professionalProfileId: 'prof-empty' });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lastUpdatedAt).toBeNull();
    }
  });

  it('returns Left<InvalidReviewError> for empty professionalProfileId', async () => {
    const result = await sut.execute({ professionalProfileId: '' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(ReviewErrorCodes.INVALID_REVIEW);
    }
  });
});
