export interface CompleteChallengeInputDTO {
  challengeId: string;
  /** Identifies the actor that triggered finalization. 'SYSTEM' for scheduled jobs. */
  triggeredBy?: 'SYSTEM' | string;
}

export interface CompleteChallengeOutputDTO {
  winners: Array<{ userId: string; rank: number; progress: number }>;
}
