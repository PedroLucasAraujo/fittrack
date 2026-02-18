export interface CreateRecurringScheduleInputDTO {
  professionalProfileId: string;
  clientId: string;
  sessionId: string;
  dayOfWeek: number;
  startTime: string;
  timezoneUsed: string;
  recurrenceCount: number;
}
