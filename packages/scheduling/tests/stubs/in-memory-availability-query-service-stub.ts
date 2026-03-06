import { right, left, DomainError } from '@fittrack/core';
import type { DomainResult, UTCDateTime } from '@fittrack/core';
import type { IAvailabilityQueryService } from '../../domain/services/availability-query-service.js';

/**
 * In-memory stub for `IAvailabilityQueryService`.
 *
 * Defaults to returning `true` (professional is available). Set
 * `shouldBeAvailable = false` to simulate a schedule conflict.
 * Set `errorToThrow` to simulate an infrastructure error (returns Left).
 */
export class InMemoryAvailabilityQueryServiceStub implements IAvailabilityQueryService {
  public shouldBeAvailable = true;
  public errorToThrow: DomainError | null = null;

  /** Calls recorded for assertion in tests. */
  public calls: Array<{
    professionalProfileId: string;
    newScheduledAtUtc: UTCDateTime;
    excludeBookingId: string;
  }> = [];

  async isProfessionalAvailable(
    professionalProfileId: string,
    newScheduledAtUtc: UTCDateTime,
    excludeBookingId: string,
  ): Promise<DomainResult<boolean>> {
    this.calls.push({ professionalProfileId, newScheduledAtUtc, excludeBookingId });

    if (this.errorToThrow) {
      return left(this.errorToThrow);
    }

    return right(this.shouldBeAvailable);
  }
}
