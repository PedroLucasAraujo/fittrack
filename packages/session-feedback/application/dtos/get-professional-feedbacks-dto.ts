export interface GetProfessionalFeedbacksInputDTO {
  professionalProfileId: string;
  /** When true, includes hidden feedbacks. Only admins may set this to true. */
  includeHidden?: boolean;
  /** When set, only returns feedbacks submitted within the last N days. */
  windowDays?: number;
}

export interface SessionFeedbackItemDTO {
  feedbackId: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  sessionDate: string;
  submittedAtUtc: string;
  isFlagged: boolean;
  isHidden: boolean;
  flaggedAtUtc: string | null;
  flagReason: string | null;
}

export interface GetProfessionalFeedbacksOutputDTO {
  feedbacks: SessionFeedbackItemDTO[];
  total: number;
}
