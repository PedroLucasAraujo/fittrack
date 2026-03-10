export interface FlagProfessionalReviewInputDTO {
  reviewId: string;
  /** professionalProfileId of the reviewer's professional or an adminId. */
  flaggedBy: string;
  reason: string;
}

export interface FlagProfessionalReviewOutputDTO {
  reviewId: string;
  flaggedAtUtc: string;
}
