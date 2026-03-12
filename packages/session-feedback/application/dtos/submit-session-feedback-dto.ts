export interface SubmitSessionFeedbackInputDTO {
  bookingId: string;
  clientId: string;
  /** Integer 1–5. */
  rating: number;
  /** Optional free-text comment (10–500 chars). */
  comment?: string;
  /** ISO date string (YYYY-MM-DD) of the session — denormalized from booking. */
  sessionDate: string;
  /** UTC ISO string of booking.completedAt — used for 48h window validation. */
  completedAtUtc: string;
  /** The professional who delivered the session. */
  professionalProfileId: string;
}

export interface SubmitSessionFeedbackOutputDTO {
  feedbackId: string;
  professionalProfileId: string;
  bookingId: string;
  rating: number;
  submittedAtUtc: string;
}
