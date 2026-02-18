import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingNotFoundError } from '../../domain/errors/booking-not-found-error.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { CancelBookingInputDTO } from '../dtos/cancel-booking-input-dto.js';
import type { CancelBookingOutputDTO } from '../dtos/cancel-booking-output-dto.js';

/**
 * Cancels an existing booking by client or professional.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): booking must belong to professionalProfileId.
 * 2. State machine (ADR-0008): only PENDING or CONFIRMED can be cancelled.
 * 3. Events are constructed by this use case after save (ADR-0009).
 */
export class CancelBooking {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(dto: CancelBookingInputDTO): Promise<DomainResult<CancelBookingOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.bookingId);
    if (idResult.isLeft()) return left(idResult.value);

    const booking = await this.bookingRepository.findByIdAndProfessionalProfileId(
      idResult.value,
      dto.professionalProfileId,
    );

    // Tenant isolation: 404 for cross-tenant or missing (ADR-0025)
    if (!booking) {
      return left(new BookingNotFoundError(dto.bookingId));
    }

    const cancelResult =
      dto.cancelledBy === 'CLIENT'
        ? booking.cancelByClient(dto.reason)
        : booking.cancelByProfessional(dto.reason);

    if (cancelResult.isLeft()) return left(cancelResult.value);

    await this.bookingRepository.save(booking);

    const cancelledAtUtc = booking.cancelledAtUtc;
    const cancelledBy = booking.cancelledBy;
    const cancellationReason = booking.cancellationReason;

    /* v8 ignore next 2 */
    if (!cancelledAtUtc || !cancelledBy || !cancellationReason)
      throw new Error('Invariant: cancellation fields must be set after cancel');

    return right({
      bookingId: booking.id,
      status: booking.status,
      cancelledBy,
      cancellationReason,
      cancelledAtUtc: cancelledAtUtc.toISO(),
    });
  }
}
