import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingNotFoundError } from '../../domain/errors/booking-not-found-error.js';
import { InvalidScheduledTimeError } from '../../domain/errors/invalid-scheduled-time-error.js';
import { ScheduleConflictError } from '../../domain/errors/schedule-conflict-error.js';
import { ReschedulingPolicy } from '../../domain/value-objects/rescheduling-policy.js';
import { BookingRescheduled } from '../../domain/events/booking-rescheduled.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { IAvailabilityQueryService } from '../../domain/services/availability-query-service.js';
import type { ISchedulingEventPublisher } from '../ports/scheduling-event-publisher-port.js';
import type { RescheduleBookingInputDTO } from '../dtos/reschedule-booking-input-dto.js';
import type { RescheduleBookingOutputDTO } from '../dtos/reschedule-booking-output-dto.js';

/**
 * Reschedules an existing open booking to a new UTC start time.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): booking scoped to `professionalProfileId`.
 * 2. No RESCHEDULED state (ADR-0022): status remains PENDING or CONFIRMED.
 * 3. Policy checks (count, notice) delegated to `Booking.canBeRescheduled()`.
 * 4. New time validation (future, business hours) done here before aggregate call.
 * 5. Availability check via `IAvailabilityQueryService` (ADR-0009 §Aggregate Purity).
 * 6. `BookingRescheduled` event dispatched after save (ADR-0009 §Post-commit dispatch).
 *
 * ## Business hours
 *
 * Validated against UTC hours 08:00–21:59 for the MVP. Timezone-aware
 * business hour enforcement is deferred to post-MVP.
 */
export class RescheduleBooking {
  private static readonly BUSINESS_HOUR_START = 8;
  private static readonly BUSINESS_HOUR_END = 22; // exclusive

  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly availabilityService: IAvailabilityQueryService,
    private readonly eventPublisher: ISchedulingEventPublisher,
  ) {}

  async execute(dto: RescheduleBookingInputDTO): Promise<DomainResult<RescheduleBookingOutputDTO>> {
    // 1. Validate booking ID format
    const idResult = UniqueEntityId.create(dto.bookingId);
    if (idResult.isLeft()) return left(idResult.value);

    // 2. Fetch booking — tenant isolation returns null for cross-tenant (ADR-0025)
    const booking = await this.bookingRepository.findByIdAndProfessionalProfileId(
      idResult.value,
      dto.professionalProfileId,
    );
    if (!booking) {
      return left(new BookingNotFoundError(dto.bookingId));
    }

    // 3. Parse new scheduled time
    const newScheduledAtUtcResult = UTCDateTime.fromISO(dto.newScheduledAtUtc);
    if (newScheduledAtUtcResult.isLeft()) return left(newScheduledAtUtcResult.value);

    const newScheduledAtUtc = newScheduledAtUtcResult.value;

    // 4. New time must be in the future
    if (newScheduledAtUtc.value.getTime() <= Date.now()) {
      return left(new InvalidScheduledTimeError('New scheduled time must be in the future'));
    }

    // 5. New time must be within business hours (UTC 08:00–21:59)
    const utcHour = newScheduledAtUtc.value.getUTCHours();
    if (
      utcHour < RescheduleBooking.BUSINESS_HOUR_START ||
      utcHour >= RescheduleBooking.BUSINESS_HOUR_END
    ) {
      return left(
        new InvalidScheduledTimeError(
          `Scheduled time must be within business hours (${RescheduleBooking.BUSINESS_HOUR_START}:00–${RescheduleBooking.BUSINESS_HOUR_END}:00 UTC). Received hour: ${utcHour}`,
        ),
      );
    }

    // 6. Policy validation (status, reschedule count, notice period)
    const policy = ReschedulingPolicy.default();
    const canRescheduleResult = booking.canBeRescheduled(policy);
    if (canRescheduleResult.isLeft()) return left(canRescheduleResult.value);

    // 7. Availability check — no direct cross-aggregate dependency (ADR-0009)
    const availabilityResult = await this.availabilityService.isProfessionalAvailable(
      booking.professionalProfileId,
      newScheduledAtUtc,
      booking.id,
    );
    if (availabilityResult.isLeft()) return left(availabilityResult.value);

    if (!availabilityResult.value) {
      return left(new ScheduleConflictError('Professional is not available at the requested time'));
    }

    // 8. Capture old time for audit trail before mutating aggregate
    const oldScheduledAtUtc = booking.scheduledAtUtc.toISO();

    // 9. Apply rescheduling (status unchanged — ADR-0022)
    // Recompute logicalDay in the booking's timezone so the calendar date
    // reflects the new appointment date, not the original creation date.
    const logicalDayResult = LogicalDay.fromDate(newScheduledAtUtc.value, booking.timezoneUsed);
    /* v8 ignore next — invariant: timezoneUsed was validated at booking creation */
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);
    const rescheduleResult = booking.reschedule(newScheduledAtUtc, logicalDayResult.value);
    /* v8 ignore next */
    if (rescheduleResult.isLeft()) return left(rescheduleResult.value);

    // 10. Persist
    await this.bookingRepository.save(booking);

    // 11. Dispatch event after save (ADR-0009 §Post-commit dispatch rule)
    await this.eventPublisher.publishBookingRescheduled(
      new BookingRescheduled(booking.id, booking.professionalProfileId, {
        oldScheduledAtUtc,
        newScheduledAtUtc: newScheduledAtUtc.toISO(),
        rescheduledBy: dto.rescheduledBy,
      }),
    );

    const lastRescheduledAtUtc = booking.lastRescheduledAtUtc;
    /* v8 ignore next 2 */
    if (!lastRescheduledAtUtc)
      throw new Error('Invariant: lastRescheduledAtUtc must be set after reschedule');

    return right({
      bookingId: booking.id,
      status: booking.status,
      oldScheduledAtUtc,
      newScheduledAtUtc: newScheduledAtUtc.toISO(),
      rescheduledBy: dto.rescheduledBy,
      rescheduleCount: booking.rescheduleCount,
      rescheduledAtUtc: lastRescheduledAtUtc.toISO(),
    });
  }
}
