import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingNotFoundError } from '../../domain/errors/booking-not-found-error.js';
import { BookingCancelledBySystem } from '../../domain/events/booking-cancelled-by-system.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { ISchedulingEventPublisher } from '../ports/scheduling-event-publisher-port.js';
import type { CancelBookingBySystemInputDTO } from '../dtos/cancel-booking-by-system-input-dto.js';
import type { CancelBookingBySystemOutputDTO } from '../dtos/cancel-booking-by-system-output-dto.js';

/**
 * Cancels a CONFIRMED booking on behalf of the system (e.g., AccessGrant revocation).
 *
 * ## Enforced invariants
 *
 * 1. No tenant scope (system actor): uses findById — all tenants accessible.
 * 2. State machine (ADR-0008): only CONFIRMED can be cancelled by system.
 * 3. Events are dispatched by this use case after save (ADR-0009).
 */
export class CancelBookingBySystem {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly eventPublisher: ISchedulingEventPublisher,
  ) {}

  async execute(
    dto: CancelBookingBySystemInputDTO,
  ): Promise<DomainResult<CancelBookingBySystemOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.bookingId);
    if (idResult.isLeft()) return left(idResult.value);

    const booking = await this.bookingRepository.findById(idResult.value);

    if (!booking) {
      return left(new BookingNotFoundError(dto.bookingId));
    }

    const cancelResult = booking.cancelBySystem(dto.reason);
    if (cancelResult.isLeft()) return left(cancelResult.value);

    await this.bookingRepository.save(booking);

    const cancelledAtUtc = booking.cancelledAtUtc;
    const cancellationReason = booking.cancellationReason;

    /* v8 ignore next 2 */
    if (!cancelledAtUtc || !cancellationReason)
      throw new Error('Invariant: cancelledAtUtc and cancellationReason must be set after cancel');

    await this.eventPublisher.publishBookingCancelledBySystem(
      new BookingCancelledBySystem(booking.id, booking.professionalProfileId, {
        reason: cancellationReason,
      }),
    );

    return right({
      bookingId: booking.id,
      status: booking.status,
      cancelledAtUtc: cancelledAtUtc.toISO(),
    });
  }
}
