export interface CreateRecurringScheduleOutputDTO {
  recurringScheduleId: string;
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  dayOfWeek: number;
  startTime: string;
  sessionCount: number;
  createdAtUtc: string;
}
