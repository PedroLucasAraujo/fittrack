export interface CreateBookingInputDTO {
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  scheduledAtUtc: string;
  timezoneUsed: string;
}
