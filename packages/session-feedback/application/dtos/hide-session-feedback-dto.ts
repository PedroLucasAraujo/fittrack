export interface HideSessionFeedbackInputDTO {
  feedbackId: string;
  /** Must be an admin. */
  hiddenBy: string;
}

export interface HideSessionFeedbackOutputDTO {
  feedbackId: string;
  hiddenAtUtc: string;
}
