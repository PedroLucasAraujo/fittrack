export interface GetProfessionalReviewsInputDTO {
  professionalProfileId: string;
  /** When true, hidden reviews are included. Requires admin privileges — enforced at API layer. */
  includeHidden?: boolean;
}

export interface ProfessionalReviewItemDTO {
  reviewId: string;
  /** "Verified Client" — never expose the actual clientId publicly. */
  clientLabel: string;
  ratings: {
    professionalism: number;
    communication: number;
    technicalKnowledge: number;
    punctuality: number;
    results: number;
  };
  overallRating: number;
  wouldRecommend: boolean;
  comment: string | null;
  professionalResponse: string | null;
  respondedAtUtc: string | null;
  createdAtUtc: string;
  sessionCountAtReview: number;
  isFlagged: boolean;
  isHidden: boolean;
}

export interface GetProfessionalReviewsOutputDTO {
  professionalProfileId: string;
  reviews: ProfessionalReviewItemDTO[];
  total: number;
}
