export interface GetProfessionalAverageRatingInputDTO {
  professionalProfileId: string;
  /** When set, computes average over the last N days. Undefined = all time. */
  windowDays?: number;
}

export interface GetProfessionalAverageRatingOutputDTO {
  professionalProfileId: string;
  averageRating: number | null;
  totalFeedbacks: number;
  windowDays: number | null;
}
