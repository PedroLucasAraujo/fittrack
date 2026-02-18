export interface CreateBookingOutputDTO {
  bookingId: string;
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  status: string;
  scheduledAtUtc: string;
  logicalDay: string;
  timezoneUsed: string;
  createdAtUtc: string;
}
