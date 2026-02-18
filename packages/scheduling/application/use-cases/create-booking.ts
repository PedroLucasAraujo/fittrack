import { left, right, UniqueEntityId, UTCDateTime, LogicalDay } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Booking } from '../../domain/aggregates/booking.js';
import { SessionNotFoundError } from '../../domain/errors/session-not-found-error.js';
import { SessionNotActiveError } from '../../domain/errors/session-not-active-error.js';
import { DoubleBookingError } from '../../domain/errors/double-booking-error.js';
import { OperationalLimitExceededError } from '../../domain/errors/operational-limit-exceeded-error.js';
import { ProfessionalBannedError } from '../../domain/errors/professional-banned-error.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { ISessionRepository } from '../../domain/repositories/session-repository.js';
import type { CreateBookingInputDTO } from '../dtos/create-booking-input-dto.js';
import type { CreateBookingOutputDTO } from '../dtos/create-booking-output-dto.js';

/** Maximum open bookings per client per professional (ADR-0041). */
const MAX_OPEN_BOOKINGS_PER_CLIENT = 10;

/**
 * Creates a Booking for a client on a specific session.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): professionalProfileId from JWT.
 * 2. Banned state (ADR-0022): checked via `isBanned` callback.
 * 3. Session must be ACTIVE.
 * 4. Double-booking prevention (ADR-0006): domain layer check.
 * 5. Open booking limit (ADR-0041): max 10 per client.
 * 6. Temporal (ADR-0010): logicalDay computed from client's timezone, immutable.
 *
 * Events (BookingConfirmed) are NOT dispatched here — they are dispatched
 * after the booking is confirmed (separate transition).
 */
export class CreateBooking {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly sessionRepository: ISessionRepository,
  ) {}

  async execute(
    dto: CreateBookingInputDTO,
    isBanned: boolean,
  ): Promise<DomainResult<CreateBookingOutputDTO>> {
    // 1. Banned state enforcement (ADR-0022)
    if (isBanned) {
      return left(new ProfessionalBannedError(dto.professionalProfileId));
    }

    // 2. Validate session exists and is active
    const sessionIdResult = UniqueEntityId.create(dto.sessionId);
    if (sessionIdResult.isLeft()) return left(sessionIdResult.value);

    const session = await this.sessionRepository.findById(sessionIdResult.value);
    if (!session || session.professionalProfileId !== dto.professionalProfileId) {
      return left(new SessionNotFoundError(dto.sessionId));
    }

    if (!session.isActive()) {
      return left(new SessionNotActiveError(dto.sessionId));
    }

    // 3. Parse temporal fields (ADR-0010)
    const scheduledAtUtcResult = UTCDateTime.fromISO(dto.scheduledAtUtc);
    if (scheduledAtUtcResult.isLeft()) return left(scheduledAtUtcResult.value);

    const logicalDayResult = LogicalDay.fromDate(
      scheduledAtUtcResult.value.value,
      dto.timezoneUsed,
    );
    if (logicalDayResult.isLeft()) return left(logicalDayResult.value);

    // 4. Double-booking prevention — domain layer check (ADR-0006)
    const hasExisting = await this.bookingRepository.existsActiveForSessionOnDay(
      dto.sessionId,
      logicalDayResult.value.value,
      dto.professionalProfileId,
    );
    if (hasExisting) {
      return left(new DoubleBookingError(dto.sessionId, logicalDayResult.value.value));
    }

    // 5. Open booking limit (ADR-0041)
    const openCount = await this.bookingRepository.countOpenByClientId(
      dto.clientId,
      dto.professionalProfileId,
    );
    if (openCount >= MAX_OPEN_BOOKINGS_PER_CLIENT) {
      return left(
        new OperationalLimitExceededError(
          'MAX_OPEN_BOOKINGS_PER_CLIENT',
          openCount,
          MAX_OPEN_BOOKINGS_PER_CLIENT,
        ),
      );
    }

    // 6. Create booking in PENDING status
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
