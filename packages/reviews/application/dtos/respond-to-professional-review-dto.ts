export interface RespondToProfessionalReviewInputDTO {
  reviewId: string;
  /** Must match the professionalProfileId on the review. */
  professionalProfileId: string;
  response: string;
}

export interface RespondToProfessionalReviewOutputDTO {
  reviewId: string;
  respondedAtUtc: string;
}
