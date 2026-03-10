export interface SubmitProfessionalReviewInputDTO {
  clientId: string;
  professionalProfileId: string;
  ratings: {
    professionalism: number;
    communication: number;
    technicalKnowledge: number;
    punctuality: number;
    results: number;
  };
  /** Optional comment — 10–1000 characters if provided. */
  comment?: string;
  wouldRecommend: boolean;
}

export interface SubmitProfessionalReviewOutputDTO {
  reviewId: string;
  professionalProfileId: string;
  clientId: string;
  overallRating: number;
  sessionCountAtReview: number;
  createdAtUtc: string;
}
