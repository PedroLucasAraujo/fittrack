import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingNotFoundError } from '../../domain/errors/booking-not-found-error.js';
import { BookingConfirmed } from '../../domain/events/booking-confirmed.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { ISchedulingEventPublisher } from '../ports/scheduling-event-publisher-port.js';
import type { ConfirmBookingInputDTO } from '../dtos/confirm-booking-input-dto.js';
import type { ConfirmBookingOutputDTO } from '../dtos/confirm-booking-output-dto.js';

/**
 * Confirms a PENDING booking, transitioning it to CONFIRMED.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): booking must belong to professionalProfileId.
 * 2. State machine (ADR-0008): only PENDING can be confirmed.
 * 3. Events are dispatched by this use case after save (ADR-0009).
 */
export class ConfirmBooking {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly eventPublisher: ISchedulingEventPublisher,
  ) {}

  async execute(dto: ConfirmBookingInputDTO): Promise<DomainResult<ConfirmBookingOutputDTO>> {
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

    const confirmResult = booking.confirm();
    if (confirmResult.isLeft()) return left(confirmResult.value);

    await this.bookingRepository.save(booking);

    await this.eventPublisher.publishBookingConfirmed(
      new BookingConfirmed(booking.id, booking.professionalProfileId, {
        sessionId: booking.sessionId,
        clientId: booking.clientId,
        professionalProfileId: booking.professionalProfileId,
        logicalDay: booking.logicalDay.value,
      }),
    );

    return right({
      bookingId: booking.id,
      status: booking.status,
    });
  }
}
