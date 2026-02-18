export interface CreateWorkingAvailabilityInputDTO {
  professionalProfileId: string;
  dayOfWeek: number;
  timezoneUsed: string;
  slots: Array<{ startTime: string; endTime: string }>;
}
