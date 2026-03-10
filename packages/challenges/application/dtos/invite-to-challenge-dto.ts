export interface InviteToChallengeInputDTO {
  challengeId: string;
  invitedBy: string;
  invitedUserId: string;
}

export interface InviteToChallengeOutputDTO {
  inviteSentAt: Date;
}
