import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Booking } from '../../domain/aggregates/booking.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found-error.js';
import { SessionNotActiveError } from '../../domain/errors/session-not-active-error.js';
import { DoubleBookingError } from '../../domain/errors/double-booking-error.js';
import { OperationalLimitExceededError } from '../../domain/errors/operational-limit-exceeded-error.js';
import { ProfessionalBannedError } from '../../domain/errors/professional-banned-error.js';
import { AccessGrantInvalidError } from '../../domain/errors/access-grant-invalid-error.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { ISessionRepository } from '../../domain/repositories/session-repository.js';
import type { CreateBookingInputDTO } from '../dtos/create-booking-input-dto.js';
import type { CreateBookingOutputDTO } from '../dtos/create-booking-output-dto.js';
import type { AccessGrantValidationDTO } from '../dtos/access-grant-validation-dto.js';

export interface CreateBookingLimits {
  maxOpenBookingsPerClient: number;
}

/**
 * Creates a Booking for a client on a specific session.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): professionalProfileId from JWT.
 * 2. Banned state (ADR-0022): checked via `isBanned` parameter.
 * 3. AccessGrant validity (ADR-0046 §3): 5-point check via `accessGrant` parameter.
 * 4. Session must be ACTIVE.
 * 5. Double-booking prevention (ADR-0006): domain layer check.
 * 6. Open booking limit (ADR-0041): configurable via constructor.
 * 7. Temporal (ADR-0010): logicalDay computed from client's timezone, immutable.
 *
 * The Scheduling context has no direct Billing dependency (ADR-0029). The
 * Application layer of the outer context resolves the AccessGrant and passes
 * the result in `accessGrant`. This mirrors the `isBanned` parameter pattern.
 *
 * Events (BookingConfirmed) are NOT dispatched here — they are dispatched
 * after the booking is confirmed (separate transition).
 */
export class CreateBooking {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly limits: CreateBookingLimits,
  ) {}

  async execute(
    dto: CreateBookingInputDTO,
    isBanned: boolean,
    accessGrant: AccessGrantValidationDTO,
  ): Promise<DomainResult<CreateBookingOutputDTO>> {
    // 1. Banned state enforcement (ADR-0022)
    if (isBanned) {
      return left(new ProfessionalBannedError(dto.professionalProfileId));
    }

    // 2. AccessGrant validity — 5-point check (ADR-0046 §3)
    if (!accessGrant.valid) {
      return left(new AccessGrantInvalidError(accessGrant.reason ?? 'NONE_FOUND'));
    }

    // 3. Validate session exists and is active
    const sessionIdResult = UniqueEntityId.create(dto.sessionId);
    if (sessionIdResult.isLeft()) return left(sessionIdResult.value);

    const session = await this.sessionRepository.findById(sessionIdResult.value);
    if (!session || session.professionalProfileId !== dto.professionalProfileId) {
      return left(new SessionNotFoundError(dto.sessionId));
    }

    if (!session.isActive()) {
      return left(new SessionNotActiveError(dto.sessionId));
    }

    // 4. Parse temporal fields (ADR-0010)
    const scheduledAtUtcResult = UTCDateTime.fromISO(dto.scheduledAtUtc);
    if (scheduledAtUtcResult.isLeft()) return left(scheduledAtUtcResult.value);

    const logicalDayResult = LogicalDay.fromDate(
      scheduledAtUtcResult.value.value,
      dto.timezoneUsed,
    );
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

    // 5. Double-booking prevention — domain layer check (ADR-0006)
    const hasExisting = await this.bookingRepository.existsActiveForSessionOnDay(
      dto.sessionId,
      logicalDayResult.value.value,
      dto.professionalProfileId,
    );
    if (hasExisting) {
      return left(new DoubleBookingError(dto.sessionId, logicalDayResult.value.value));
    }

    // 6. Open booking limit (ADR-0041) — configurable, not hardcoded
    const openCount = await this.bookingRepository.countOpenByClientId(
      dto.clientId,
      dto.professionalProfileId,
    );
    if (openCount >= this.limits.maxOpenBookingsPerClient) {
      return left(
        new OperationalLimitExceededError(
          'MAX_OPEN_BOOKINGS_PER_CLIENT',
          openCount,
          this.limits.maxOpenBookingsPerClient,
        ),
      );
    }

    // 7. Create booking in PENDING status
    const bookingResult = Booking.create({
      professionalProfileId: dto.professionalProfileId,
      clientId: dto.clientId,
      sessionId: dto.sessionId,
      scheduledAtUtc: scheduledAtUtcResult.value,
      logicalDay: logicalDayResult.value,
      timezoneUsed: dto.timezoneUsed,
    });
    /* v8 ignore next */
    if (bookingResult.isLeft()) return left(bookingResult.value);

    const booking = bookingResult.value;
    await this.bookingRepository.save(booking);

    return right({
      bookingId: booking.id,
      professionalProfileId: booking.professionalProfileId,
      clientId: booking.clientId,
      sessionId: booking.sessionId,
      status: booking.status,
      scheduledAtUtc: booking.scheduledAtUtc.toISO(),
      logicalDay: booking.logicalDay.value,
      timezoneUsed: booking.timezoneUsed,
      createdAtUtc: booking.createdAtUtc.toISO(),
    });
  }
}
