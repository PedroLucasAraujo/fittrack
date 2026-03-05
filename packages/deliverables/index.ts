// ── Enums ──────────────────────────────────────────────────────────────────────
export { DeliverableType } from './domain/enums/deliverable-type.js';
export type { DeliverableType as DeliverableTypeValue } from './domain/enums/deliverable-type.js';
export { DeliverableStatus } from './domain/enums/deliverable-status.js';
export type { DeliverableStatus as DeliverableStatusValue } from './domain/enums/deliverable-status.js';
export { TemplateStatus } from './domain/enums/template-status.js';
export type { TemplateStatus as TemplateStatusValue } from './domain/enums/template-status.js';

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
export { TemplateErrorCodes } from './domain/errors/template-error-codes.js';
export { InvalidTemplateError } from './domain/errors/invalid-template-error.js';
export { InvalidTemplateTransitionError } from './domain/errors/invalid-template-transition-error.js';
export { InvalidTemplateStructureError } from './domain/errors/invalid-template-structure-error.js';
export { TemplateNotFoundError } from './domain/errors/template-not-found-error.js';
export { TemplateNotActiveError } from './domain/errors/template-not-active-error.js';
export { TemplateCannotBeEditedError } from './domain/errors/template-cannot-be-edited-error.js';
export { TemplateNameAlreadyExistsError } from './domain/errors/template-name-already-exists-error.js';

// ── Value Objects ──────────────────────────────────────────────────────────────
export { DeliverableTitle } from './domain/value-objects/deliverable-title.js';
export { TemplateName } from './domain/value-objects/template-name.js';
export { TemplateVersion } from './domain/value-objects/template-version.js';
export { TemplateParameter } from './domain/value-objects/template-parameter.js';
export type {
  TemplateParameterProps,
  ParameterType,
} from './domain/value-objects/template-parameter.js';
export { WorkoutTemplateStructure } from './domain/value-objects/template-structure/workout-template-structure.js';
export type {
  WorkoutSession,
  WorkoutExerciseRef,
} from './domain/value-objects/template-structure/workout-template-structure.js';
export { DietTemplateStructure } from './domain/value-objects/template-structure/diet-template-structure.js';
export type {
  MealTemplate,
  DietFoodRef,
} from './domain/value-objects/template-structure/diet-template-structure.js';
export { AssessmentTemplateStructure } from './domain/value-objects/template-structure/assessment-template-structure.js';
export type { AssessmentQuestion } from './domain/value-objects/template-structure/assessment-template-structure.js';
export type {
  ITemplateStructure,
  TemplateSnapshot,
} from './domain/value-objects/template-structure/i-template-structure.js';

// ── Entities ───────────────────────────────────────────────────────────────────
export { ExerciseAssignment } from './domain/entities/exercise-assignment.js';
export type {
  ExerciseAssignmentProps,
  ExerciseAssignmentCreateInput,
} from './domain/entities/exercise-assignment.js';

// ── Aggregates ─────────────────────────────────────────────────────────────────
export { Deliverable } from './domain/aggregates/deliverable.js';
export type { DeliverableProps } from './domain/aggregates/deliverable.js';
export { DeliverableTemplate } from './domain/aggregates/deliverable-template.js';
export type { DeliverableTemplateProps } from './domain/aggregates/deliverable-template.js';

// ── Repositories ───────────────────────────────────────────────────────────────
export type { IDeliverableRepository } from './domain/repositories/deliverable-repository.js';
export type { IDeliverableTemplateRepository } from './domain/repositories/deliverable-template-repository.js';

// ── Application Ports ──────────────────────────────────────────────────────────
export type { IDeliverableTemplateEventPublisher } from './application/ports/deliverable-template-event-publisher-port.js';

// ── Domain Events ──────────────────────────────────────────────────────────────
export { DeliverableTemplateCreatedEvent } from './domain/events/deliverable-template-created-event.js';
export { DeliverableTemplateActivatedEvent } from './domain/events/deliverable-template-activated-event.js';
export { DeliverableTemplateArchivedEvent } from './domain/events/deliverable-template-archived-event.js';
export { DeliverableTemplateVersionedEvent } from './domain/events/deliverable-template-versioned-event.js';
export { DeliverableTemplateInstantiatedEvent } from './domain/events/deliverable-template-instantiated-event.js';

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
export type { DeliverableTemplateOutputDTO } from './application/dtos/deliverable-template-output-dto.js';
export type { CreateDeliverableTemplateInputDTO } from './application/dtos/create-deliverable-template-input-dto.js';
export type { ActivateDeliverableTemplateInputDTO } from './application/dtos/activate-deliverable-template-input-dto.js';
export type { UpdateDeliverableTemplateInputDTO } from './application/dtos/update-deliverable-template-input-dto.js';
export type { CreateTemplateVersionInputDTO } from './application/dtos/create-template-version-input-dto.js';
export type { ArchiveDeliverableTemplateInputDTO } from './application/dtos/archive-deliverable-template-input-dto.js';
export type { InstantiateDeliverableTemplateInputDTO } from './application/dtos/instantiate-deliverable-template-input-dto.js';
export type { ListDeliverableTemplatesInputDTO } from './application/dtos/list-deliverable-templates-input-dto.js';
export type { GetDeliverableTemplateInputDTO } from './application/dtos/get-deliverable-template-input-dto.js';

// ── Use Cases ──────────────────────────────────────────────────────────────────
export { CreateDeliverable } from './application/use-cases/create-deliverable.js';
export { ActivateDeliverable } from './application/use-cases/activate-deliverable.js';
export { ArchiveDeliverable } from './application/use-cases/archive-deliverable.js';
export { CreateDeliverableTemplate } from './application/use-cases/create-deliverable-template.js';
export { ActivateDeliverableTemplate } from './application/use-cases/activate-deliverable-template.js';
export { UpdateDeliverableTemplate } from './application/use-cases/update-deliverable-template.js';
export { CreateTemplateVersion } from './application/use-cases/create-template-version.js';
export { ArchiveDeliverableTemplate } from './application/use-cases/archive-deliverable-template.js';
export { InstantiateDeliverableTemplate } from './application/use-cases/instantiate-deliverable-template.js';
export { ListDeliverableTemplates } from './application/use-cases/list-deliverable-templates.js';
export { GetDeliverableTemplate } from './application/use-cases/get-deliverable-template.js';
