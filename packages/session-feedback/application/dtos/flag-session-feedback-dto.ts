export interface FlagSessionFeedbackInputDTO {
  feedbackId: string;
  /** ID of the actor performing the flag (professional or admin). */
  flaggedBy: string;
  /** Role of the actor: 'professional' may only flag their own feedback. */
  flaggedByRole: 'professional' | 'admin';
  reason: string;
}

export interface FlagSessionFeedbackOutputDTO {
  feedbackId: string;
  flaggedAtUtc: string;
}
