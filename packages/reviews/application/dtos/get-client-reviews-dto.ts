export interface GetClientReviewsInputDTO {
  clientId: string;
}

export interface ClientReviewItemDTO {
  reviewId: string;
  professionalProfileId: string;
  overallRating: number;
  wouldRecommend: boolean;
  comment: string | null;
  createdAtUtc: string;
  sessionCountAtReview: number;
}

export interface GetClientReviewsOutputDTO {
  clientId: string;
  reviews: ClientReviewItemDTO[];
  total: number;
}
