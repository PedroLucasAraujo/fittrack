// ── Enums ────────────────────────────────────────────────────────────────────
export { BookingStatus } from './domain/enums/booking-status.js';
export { SessionStatus } from './domain/enums/session-status.js';
export { DayOfWeek } from './domain/enums/day-of-week.js';

// ── Value Objects ────────────────────────────────────────────────────────────
export { DurationMinutes } from './domain/value-objects/duration-minutes.js';
export { SessionTitle } from './domain/value-objects/session-title.js';
export { TimeSlot } from './domain/value-objects/time-slot.js';

// ── Errors ───────────────────────────────────────────────────────────────────
export { SchedulingErrorCodes } from './domain/errors/scheduling-error-codes.js';
export type { SchedulingErrorCode } from './domain/errors/scheduling-error-codes.js';
export { InvalidBookingTransitionError } from './domain/errors/invalid-booking-transition-error.js';
export { InvalidDurationError } from './domain/errors/invalid-duration-error.js';
export { InvalidTimeSlotError } from './domain/errors/invalid-time-slot-error.js';
export { OverlappingTimeSlotError } from './domain/errors/overlapping-time-slot-error.js';
export { InvalidSessionTitleError } from './domain/errors/invalid-session-title-error.js';
export { SessionNotFoundError } from './domain/errors/session-not-found-error.js';
export { SessionNotActiveError } from './domain/errors/session-not-active-error.js';
export { BookingNotFoundError } from './domain/errors/booking-not-found-error.js';
export { DoubleBookingError } from './domain/errors/double-booking-error.js';
export { OperationalLimitExceededError } from './domain/errors/operational-limit-exceeded-error.js';
export { ProfessionalBannedError } from './domain/errors/professional-banned-error.js';
export { RecurringScheduleNotFoundError } from './domain/errors/recurring-schedule-not-found-error.js';
export { WorkingAvailabilityNotFoundError } from './domain/errors/working-availability-not-found-error.js';

// ── Domain Event Contracts ───────────────────────────────────────────────────
// Events are dispatched explicitly by the Application layer (UseCases),
// NOT by aggregates or repositories. See ADR-0009 Official Domain Events Policy.
export { BookingConfirmed } from './domain/events/booking-confirmed.js';
export { BookingCancelled } from './domain/events/booking-cancelled.js';
export { BookingCancelledBySystem } from './domain/events/booking-cancelled-by-system.js';
export { BookingCompleted } from './domain/events/booking-completed.js';
export { BookingNoShow } from './domain/events/booking-no-show.js';
export { RecurringScheduleCreated } from './domain/events/recurring-schedule-created.js';

// ── Repository Interfaces ────────────────────────────────────────────────────
export type { ISessionRepository } from './domain/repositories/session-repository.js';
export type { IBookingRepository } from './domain/repositories/booking-repository.js';
export type { IWorkingAvailabilityRepository } from './domain/repositories/working-availability-repository.js';
export type { IRecurringScheduleRepository } from './domain/repositories/recurring-schedule-repository.js';

// ── Application — Input DTOs ─────────────────────────────────────────────────
export type { CreateSessionInputDTO } from './application/dtos/create-session-input-dto.js';
export type { CreateWorkingAvailabilityInputDTO } from './application/dtos/create-working-availability-input-dto.js';
export type { UpdateWorkingAvailabilityInputDTO } from './application/dtos/update-working-availability-input-dto.js';
export type { CreateBookingInputDTO } from './application/dtos/create-booking-input-dto.js';
export type { CancelBookingInputDTO } from './application/dtos/cancel-booking-input-dto.js';
export type { CreateRecurringScheduleInputDTO } from './application/dtos/create-recurring-schedule-input-dto.js';

// ── Application — Output DTOs ────────────────────────────────────────────────
export type { CreateSessionOutputDTO } from './application/dtos/create-session-output-dto.js';
export type { CreateWorkingAvailabilityOutputDTO } from './application/dtos/create-working-availability-output-dto.js';
export type { UpdateWorkingAvailabilityOutputDTO } from './application/dtos/update-working-availability-output-dto.js';
export type { CreateBookingOutputDTO } from './application/dtos/create-booking-output-dto.js';
export type { CancelBookingOutputDTO } from './application/dtos/cancel-booking-output-dto.js';
export type { CreateRecurringScheduleOutputDTO } from './application/dtos/create-recurring-schedule-output-dto.js';

// ── Application — Use Cases ──────────────────────────────────────────────────
export { CreateSession } from './application/use-cases/create-session.js';
export { CreateWorkingAvailability } from './application/use-cases/create-working-availability.js';
export { UpdateWorkingAvailability } from './application/use-cases/update-working-availability.js';
export { CreateBooking } from './application/use-cases/create-booking.js';
export { CancelBooking } from './application/use-cases/cancel-booking.js';
export { CreateRecurringSchedule } from './application/use-cases/create-recurring-schedule.js';
