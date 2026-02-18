export interface UpdateWorkingAvailabilityOutputDTO {
  workingAvailabilityId: string;
  slots: Array<{ startTime: string; endTime: string }>;
  updatedAtUtc: string;
}
