export interface GetProfessionalReputationScoreInputDTO {
  professionalProfileId: string;
}

export interface GetProfessionalReputationScoreOutputDTO {
  professionalProfileId: string;
  /** Bayesian-weighted score in [1.0, 5.0]. 0 if no reviews. */
  overallScore: number;
  /** Arithmetic mean of all visible review ratings. 0 if no reviews. */
  averageRating: number;
  totalReviews: number;
  /** Percentage of clients who would recommend. 0 if no reviews. */
  recommendationRate: number;
  averageProfessionalism: number;
  averageCommunication: number;
  averageTechnicalKnowledge: number;
  averagePunctuality: number;
  averageResults: number;
  lastUpdatedAt: string | null;
}
