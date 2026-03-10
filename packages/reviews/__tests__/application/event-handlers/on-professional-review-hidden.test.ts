import { describe, it, expect, beforeEach } from 'vitest';
import { OnProfessionalReviewSubmitted } from '../../../application/event-handlers/on-professional-review-submitted.js';
import { OnProfessionalReviewHidden } from '../../../application/event-handlers/on-professional-review-hidden.js';
import { InMemoryReputationRepository } from '../stubs/in-memory-reputation-repository.js';

const submittedPayload = (reviewId = 'review-001', wouldRecommend = true) => ({
  reviewId,
  professionalProfileId: 'prof-abc',
  clientId: 'client-xyz',
  overallRating: 5.0,
  ratings: {
    professionalism: 5,
    communication: 5,
    technicalKnowledge: 5,
    punctuality: 5,
    results: 5,
  },
  wouldRecommend,
  verifiedInteraction: true,
  sessionCountAtReview: 10,
  submittedAtUtc: new Date().toISOString(),
});

const hiddenPayload = (reviewId = 'review-001', wouldRecommend = true) => ({
  reviewId,
  professionalProfileId: 'prof-abc',
  hiddenBy: 'admin-001',
  overallRating: 5.0,
  ratings: {
    professionalism: 5,
    communication: 5,
    technicalKnowledge: 5,
    punctuality: 5,
    results: 5,
  },
  wouldRecommend,
  hiddenAtUtc: new Date().toISOString(),
});

describe('OnProfessionalReviewHidden', () => {
  let submitHandler: OnProfessionalReviewSubmitted;
  let hideHandler: OnProfessionalReviewHidden;
  let reputationRepo: InMemoryReputationRepository;

  beforeEach(() => {
    reputationRepo = new InMemoryReputationRepository();
    submitHandler = new OnProfessionalReviewSubmitted(reputationRepo);
    hideHandler = new OnProfessionalReviewHidden(reputationRepo);
  });

  it('decrements totalReviews after hiding a review', async () => {
    await submitHandler.handle(submittedPayload('r1'));
    await submitHandler.handle(submittedPayload('r2'));

    await hideHandler.handle(hiddenPayload('r1'));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.totalReviews).toBe(1);
  });

  it('decrements wouldRecommendCount when hidden review recommended', async () => {
    await submitHandler.handle(submittedPayload('r1', true));

    await hideHandler.handle(hiddenPayload('r1', true));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.wouldRecommendCount).toBe(0);
  });

  it('does not decrement wouldRecommendCount when hidden review did not recommend', async () => {
    await submitHandler.handle(submittedPayload('r1', false));
    await submitHandler.handle(submittedPayload('r2', true));

    await hideHandler.handle(hiddenPayload('r1', false));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.wouldRecommendCount).toBe(1);
  });

  it('recalculates Bayesian score after hiding', async () => {
    await submitHandler.handle(submittedPayload('r1'));
    await submitHandler.handle(submittedPayload('r2'));
    const before = (await reputationRepo.findByProfessional('prof-abc'))!.totalReviews;

    await hideHandler.handle(hiddenPayload('r1'));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.totalReviews).toBe(before - 1);
    // Score is still valid Bayesian
    expect(reputation!.overallScore.value).toBeGreaterThanOrEqual(0);
  });

  it('sets totalReviews to 0 and score to 0 when all reviews are hidden', async () => {
    await submitHandler.handle(submittedPayload('r1'));

    await hideHandler.handle(hiddenPayload('r1'));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.totalReviews).toBe(0);
    expect(reputation!.overallScore.value).toBe(0);
    expect(reputation!.averageRating).toBe(0);
    expect(reputation!.recommendationRate.value).toBe(0);
  });

  it('does nothing when no reputation record exists', async () => {
    // Should not throw
    await expect(hideHandler.handle(hiddenPayload('r-unknown'))).resolves.toBeUndefined();
  });
});
