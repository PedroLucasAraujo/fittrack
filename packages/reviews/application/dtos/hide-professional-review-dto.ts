export interface HideProfessionalReviewInputDTO {
  reviewId: string;
  /** Admin ID. Only admins can hide reviews. */
  hiddenBy: string;
}

export interface HideProfessionalReviewOutputDTO {
  reviewId: string;
  hiddenAtUtc: string;
}
