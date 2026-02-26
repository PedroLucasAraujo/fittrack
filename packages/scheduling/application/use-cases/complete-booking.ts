import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { BookingNotFoundError } from '../../domain/errors/booking-not-found-error.js';
import { BookingCompleted } from '../../domain/events/booking-completed.js';
import type { IBookingRepository } from '../../domain/repositories/booking-repository.js';
import type { ISchedulingEventPublisher } from '../ports/scheduling-event-publisher-port.js';
import type { CompleteBookingInputDTO } from '../dtos/complete-booking-input-dto.js';
import type { CompleteBookingOutputDTO } from '../dtos/complete-booking-output-dto.js';

/**
 * Completes a CONFIRMED booking, linking it to an executionId.
 *
 * ## Enforced invariants
 *
 * 1. Tenant isolation (ADR-0025): booking must belong to professionalProfileId.
 * 2. State machine (ADR-0008): only CONFIRMED can be completed.
 * 3. Events are dispatched by this use case after save (ADR-0009).
 */
export class CompleteBooking {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly eventPublisher: ISchedulingEventPublisher,
  ) {}

  async execute(dto: CompleteBookingInputDTO): Promise<DomainResult<CompleteBookingOutputDTO>> {
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

    const completeResult = booking.complete(dto.executionId);
    if (completeResult.isLeft()) return left(completeResult.value);

    await this.bookingRepository.save(booking);

    const completedAtUtc = booking.completedAtUtc;
    const executionId = booking.executionId;

    /* v8 ignore next 2 */
    if (!completedAtUtc || !executionId)
      throw new Error('Invariant: completedAtUtc and executionId must be set after complete');

    await this.eventPublisher.publishBookingCompleted(
      new BookingCompleted(booking.id, booking.professionalProfileId, {
        executionId,
      }),
    );

    return right({
      bookingId: booking.id,
      status: booking.status,
      executionId,
      completedAtUtc: completedAtUtc.toISO(),
    });
  }
}
