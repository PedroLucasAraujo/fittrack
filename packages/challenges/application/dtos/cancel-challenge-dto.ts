export interface CancelChallengeInputDTO {
  challengeId: string;
  canceledBy: string;
  reason: string;
}

export interface CancelChallengeOutputDTO {
  canceledAt: Date;
}
