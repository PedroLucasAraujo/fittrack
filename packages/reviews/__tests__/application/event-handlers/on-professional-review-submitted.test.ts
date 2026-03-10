import { describe, it, expect, beforeEach } from 'vitest';
import { OnProfessionalReviewSubmitted } from '../../../application/event-handlers/on-professional-review-submitted.js';
import { InMemoryReputationRepository } from '../stubs/in-memory-reputation-repository.js';

const makePayload = (
  overrides: Partial<{
    overallRating: number;
    professionalism: number;
    communication: number;
    technicalKnowledge: number;
    punctuality: number;
    results: number;
    wouldRecommend: boolean;
  }> = {},
) => ({
  reviewId: 'review-001',
  professionalProfileId: 'prof-abc',
  clientId: 'client-xyz',
  overallRating: overrides.overallRating ?? 4.4,
  ratings: {
    professionalism: overrides.professionalism ?? 4,
    communication: overrides.communication ?? 5,
    technicalKnowledge: overrides.technicalKnowledge ?? 4,
    punctuality: overrides.punctuality ?? 5,
    results: overrides.results ?? 4,
  },
  wouldRecommend: overrides.wouldRecommend ?? true,
  verifiedInteraction: true,
  sessionCountAtReview: 10,
  submittedAtUtc: new Date().toISOString(),
});

describe('OnProfessionalReviewSubmitted', () => {
  let sut: OnProfessionalReviewSubmitted;
  let reputationRepo: InMemoryReputationRepository;

  beforeEach(() => {
    reputationRepo = new InMemoryReputationRepository();
    sut = new OnProfessionalReviewSubmitted(reputationRepo);
  });

  it('creates a new reputation score when none exists', async () => {
    await sut.handle(makePayload());

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation).not.toBeNull();
    expect(reputation!.totalReviews).toBe(1);
  });

  it('increments totalReviews on each review', async () => {
    await sut.handle(makePayload({ wouldRecommend: true }));
    await sut.handle({ ...makePayload(), reviewId: 'review-002' });

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.totalReviews).toBe(2);
  });

  it('increments wouldRecommendCount when wouldRecommend is true', async () => {
    await sut.handle(makePayload({ wouldRecommend: true }));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.wouldRecommendCount).toBe(1);
  });

  it('does not increment wouldRecommendCount when wouldRecommend is false', async () => {
    await sut.handle(makePayload({ wouldRecommend: false }));

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.wouldRecommendCount).toBe(0);
  });

  it('calculates averageRating correctly across multiple reviews', async () => {
    await sut.handle(makePayload({ overallRating: 4.0 }));
    await sut.handle({ ...makePayload({ overallRating: 5.0 }), reviewId: 'review-002' });

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.averageRating).toBeCloseTo(4.5, 1);
  });

  it('calculates Bayesian score correctly (low-volume professional)', async () => {
    // 2 reviews avg 5.0 → Bayesian should be around 4.27 (not 5.0)
    await sut.handle(
      makePayload({
        overallRating: 5.0,
        professionalism: 5,
        communication: 5,
        technicalKnowledge: 5,
        punctuality: 5,
        results: 5,
      }),
    );
    await sut.handle({
      ...makePayload({
        overallRating: 5.0,
        professionalism: 5,
        communication: 5,
        technicalKnowledge: 5,
        punctuality: 5,
        results: 5,
      }),
      reviewId: 'review-002',
    });

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    // Bayesian with 2 reviews, avg 5.0, platform 4.2, m=20 ≈ 4.27
    expect(reputation!.overallScore.value).toBeLessThan(5.0);
    expect(reputation!.overallScore.value).toBeGreaterThan(4.0);
  });

  it('calculates recommendation rate correctly', async () => {
    await sut.handle(makePayload({ wouldRecommend: true }));
    await sut.handle({ ...makePayload({ wouldRecommend: false }), reviewId: 'review-002' });

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    // 1/2 = 50.0%
    expect(reputation!.recommendationRate.value).toBe(50.0);
  });

  it('updates lastUpdatedAtUtc', async () => {
    await sut.handle(makePayload());

    const reputation = await reputationRepo.findByProfessional('prof-abc');
    expect(reputation!.lastUpdatedAtUtc).not.toBeNull();
  });
});
