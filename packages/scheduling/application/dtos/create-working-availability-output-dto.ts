export interface CreateWorkingAvailabilityOutputDTO {
  workingAvailabilityId: string;
  professionalProfileId: string;
  dayOfWeek: number;
  timezoneUsed: string;
  slots: Array<{ startTime: string; endTime: string }>;
  createdAtUtc: string;
}
