import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingNotFoundError } from '../../domain/errors/booking-not-found-error.js';
import { BookingNoShow } from '../../domain/events/booking-no-show.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { ISchedulingEventPublisher } from '../ports/scheduling-event-publisher-port.js';
import type { MarkBookingNoShowInputDTO } from '../dtos/mark-booking-no-show-input-dto.js';
import type { MarkBookingNoShowOutputDTO } from '../dtos/mark-booking-no-show-output-dto.js';

/**
 * Marks a CONFIRMED booking as NO_SHOW when the client does not attend.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): booking must belong to professionalProfileId.
 * 2. State machine (ADR-0008): only CONFIRMED can transition to NO_SHOW.
 * 3. Events are dispatched by this use case after save (ADR-0009).
 */
export class MarkBookingNoShow {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly eventPublisher: ISchedulingEventPublisher,
  ) {}

  async execute(dto: MarkBookingNoShowInputDTO): Promise<DomainResult<MarkBookingNoShowOutputDTO>> {
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

    const noShowResult = booking.markNoShow();
    if (noShowResult.isLeft()) return left(noShowResult.value);

    await this.bookingRepository.save(booking);

    await this.eventPublisher.publishBookingNoShow(
      new BookingNoShow(booking.id, booking.professionalProfileId, {}),
    );

    return right({
      bookingId: booking.id,
      status: booking.status,
    });
  }
}
