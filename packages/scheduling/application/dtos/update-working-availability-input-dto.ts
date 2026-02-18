export interface UpdateWorkingAvailabilityInputDTO {
  workingAvailabilityId: string;
  professionalProfileId: string;
  slots: Array<{ startTime: string; endTime: string }>;
}
