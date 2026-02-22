// ── Enums ──────────────────────────────────────────────────────────────────────
export { DeliverableType } from './domain/enums/deliverable-type.js';
export type { DeliverableType as DeliverableTypeValue } from './domain/enums/deliverable-type.js';
export { DeliverableStatus } from './domain/enums/deliverable-status.js';
export type { DeliverableStatus as DeliverableStatusValue } from './domain/enums/deliverable-status.js';

// ── Errors ─────────────────────────────────────────────────────────────────────
export { DeliverableErrorCodes } from './domain/errors/deliverable-error-codes.js';
export type { DeliverableErrorCode } from './domain/errors/deliverable-error-codes.js';
export { InvalidDeliverableError } from './domain/errors/invalid-deliverable-error.js';
export { InvalidDeliverableTransitionError } from './domain/errors/invalid-deliverable-transition-error.js';
export { DeliverableNotFoundError } from './domain/errors/deliverable-not-found-error.js';
export { DeliverableNotActiveError } from './domain/errors/deliverable-not-active-error.js';
export { DeliverableNotDraftError } from './domain/errors/deliverable-not-draft-error.js';
export { EmptyExerciseListError } from './domain/errors/empty-exercise-list-error.js';
export { ExerciseNotFoundError } from './domain/errors/exercise-not-found-error.js';

// ── Value Objects ──────────────────────────────────────────────────────────────
export { DeliverableTitle } from './domain/value-objects/deliverable-title.js';

// ── Entities ───────────────────────────────────────────────────────────────────
export { ExerciseAssignment } from './domain/entities/exercise-assignment.js';
export type { ExerciseAssignmentProps } from './domain/entities/exercise-assignment.js';

// ── Aggregates ─────────────────────────────────────────────────────────────────
export { Deliverable } from './domain/aggregates/deliverable.js';
export type { DeliverableProps } from './domain/aggregates/deliverable.js';

// ── Domain Events ──────────────────────────────────────────────────────────────
export { DeliverableCreated } from './domain/events/deliverable-created.js';
export { DeliverableActivated } from './domain/events/deliverable-activated.js';
export { DeliverableArchived } from './domain/events/deliverable-archived.js';

// ── Repositories ───────────────────────────────────────────────────────────────
export type { IDeliverableRepository } from './domain/repositories/deliverable-repository.js';

// ── DTOs ───────────────────────────────────────────────────────────────────────
export type {
  CreateDeliverableInputDTO,
  ExerciseAssignmentInputDTO,
} from './application/dtos/create-deliverable-input-dto.js';
export type { CreateDeliverableOutputDTO } from './application/dtos/create-deliverable-output-dto.js';
export type { ActivateDeliverableInputDTO } from './application/dtos/activate-deliverable-input-dto.js';
export type { ActivateDeliverableOutputDTO } from './application/dtos/activate-deliverable-output-dto.js';
export type { ArchiveDeliverableInputDTO } from './application/dtos/archive-deliverable-input-dto.js';
export type { ArchiveDeliverableOutputDTO } from './application/dtos/archive-deliverable-output-dto.js';

// ── Use Cases ──────────────────────────────────────────────────────────────────
export { CreateDeliverable } from './application/use-cases/create-deliverable.js';
export { ActivateDeliverable } from './application/use-cases/activate-deliverable.js';
export { ArchiveDeliverable } from './application/use-cases/archive-deliverable.js';
