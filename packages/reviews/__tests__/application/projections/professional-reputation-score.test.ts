import { describe, it, expect } from 'vitest';
import { ProfessionalReputationScore } from '../../../application/projections/professional-reputation-score.js';

const reviewA = {
  professionalism: 5,
  communication: 5,
  technicalKnowledge: 5,
  punctuality: 5,
  results: 5,
  overallRating: 5.0,
  wouldRecommend: true,
};

const reviewB = {
  professionalism: 3,
  communication: 3,
  technicalKnowledge: 3,
  punctuality: 3,
  results: 3,
  overallRating: 3.0,
  wouldRecommend: false,
};

describe('ProfessionalReputationScore', () => {
  describe('createEmpty()', () => {
    it('initialises with zero counters and scores', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');

      expect(rep.professionalProfileId).toBe('prof-abc');
      expect(rep.totalReviews).toBe(0);
      expect(rep.wouldRecommendCount).toBe(0);
      expect(rep.overallScore.value).toBe(0);
      expect(rep.averageRating).toBe(0);
      expect(rep.recommendationRate.value).toBe(0);
      expect(rep.lastUpdatedAtUtc).toBeNull();
    });
  });

  describe('addReview()', () => {
    it('increments totalReviews', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);
      expect(rep.totalReviews).toBe(1);
    });

    it('increments wouldRecommendCount when true', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA); // wouldRecommend: true
      expect(rep.wouldRecommendCount).toBe(1);
    });

    it('does not increment wouldRecommendCount when false', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewB); // wouldRecommend: false
      expect(rep.wouldRecommendCount).toBe(0);
    });

    it('calculates average ratings correctly after two reviews', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA); // all 5s, avg 5.0
      rep.addReview(reviewB); // all 3s, avg 3.0

      expect(rep.averageProfessionalism).toBe(4.0);
      expect(rep.averageCommunication).toBe(4.0);
      expect(rep.averageRating).toBe(4.0);
    });

    it('calculates recommendation rate correctly', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA); // wouldRecommend: true
      rep.addReview(reviewB); // wouldRecommend: false

      expect(rep.recommendationRate.value).toBe(50.0);
    });

    it('applies Bayesian formula (score < simple average for low volume)', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA); // avg 5.0, 1 review

      // Bayesian with 1 review should be less than 5.0
      expect(rep.overallScore.value).toBeLessThan(5.0);
      expect(rep.overallScore.value).toBeGreaterThan(0);
    });

    it('sets lastUpdatedAtUtc', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);
      expect(rep.lastUpdatedAtUtc).not.toBeNull();
    });
  });

  describe('removeReview()', () => {
    it('decrements totalReviews', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);
      rep.addReview(reviewB);
      rep.removeReview(reviewA);

      expect(rep.totalReviews).toBe(1);
    });

    it('decrements wouldRecommendCount when review recommended', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA); // wouldRecommend: true
      rep.removeReview(reviewA);

      expect(rep.wouldRecommendCount).toBe(0);
    });

    it('does not decrement wouldRecommendCount when review did not recommend', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA); // wouldRecommend: true
      rep.addReview(reviewB); // wouldRecommend: false
      rep.removeReview(reviewB);

      expect(rep.wouldRecommendCount).toBe(1); // Only reviewA recommended
    });

    it('resets to zero state when last review is removed', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);
      rep.removeReview(reviewA);

      expect(rep.totalReviews).toBe(0);
      expect(rep.overallScore.value).toBe(0);
      expect(rep.averageRating).toBe(0);
      expect(rep.recommendationRate.value).toBe(0);
    });

    it('does not go below 0 for totalReviews', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);
      rep.removeReview(reviewA);
      rep.removeReview(reviewA); // Extra removal

      expect(rep.totalReviews).toBe(0);
    });
  });

  describe('reconstitute()', () => {
    it('restores props from persisted data', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);

      const reconstituted = ProfessionalReputationScore.reconstitute(rep.toProps());

      expect(reconstituted.professionalProfileId).toBe('prof-abc');
      expect(reconstituted.totalReviews).toBe(1);
      expect(reconstituted.overallScore.value).toBe(rep.overallScore.value);
    });
  });

  describe('getters', () => {
    it('exposes all computed fields', () => {
      const rep = ProfessionalReputationScore.createEmpty('prof-abc');
      rep.addReview(reviewA);

      expect(rep.averageTechnicalKnowledge).toBeGreaterThan(0);
      expect(rep.averagePunctuality).toBeGreaterThan(0);
      expect(rep.averageResults).toBeGreaterThan(0);
    });
  });
});
