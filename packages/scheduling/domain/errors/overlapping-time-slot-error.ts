import { DomainError } from '@fittrack/core';
import type { ErrorCode } from '@fittrack/core';
import { SchedulingErrorCodes } from './scheduling-error-codes.js';

export class OverlappingTimeSlotError extends DomainError {
  constructor(startTime: string, endTime: string) {
    super(
      `Time slot ${startTime}–${endTime} overlaps with an existing slot.`,
      SchedulingErrorCodes.OVERLAPPING_TIME_SLOT as ErrorCode,
      { startTime, endTime },
    );
  }
}
