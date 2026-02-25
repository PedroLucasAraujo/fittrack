// ── Aggregates ────────────────────────────────────────────────────────────────
export { User } from './domain/aggregates/user.js';
export type { UserProps } from './domain/aggregates/user.js';
export { ProfessionalProfile } from './domain/aggregates/professional-profile.js';
export type { ProfessionalProfileProps } from './domain/aggregates/professional-profile.js';

// ── Enums ────────────────────────────────────────────────────────────────────
export { RiskStatus } from './domain/enums/risk-status.js';
export { UserRole } from './domain/enums/user-role.js';
export { ProfessionalProfileStatus } from './domain/enums/professional-profile-status.js';

// ── Value Objects ────────────────────────────────────────────────────────────
export { Email } from './domain/value-objects/email.js';
export { PersonName } from './domain/value-objects/person-name.js';

// ── Errors ───────────────────────────────────────────────────────────────────
export { IdentityErrorCodes } from './domain/errors/identity-error-codes.js';
export type { IdentityErrorCode } from './domain/errors/identity-error-codes.js';
export { InvalidEmailError } from './domain/errors/invalid-email-error.js';
export { InvalidPersonNameError } from './domain/errors/invalid-person-name-error.js';
export { InvalidProfileTransitionError } from './domain/errors/invalid-profile-transition-error.js';
export { InvalidRiskStatusTransitionError } from './domain/errors/invalid-risk-status-transition-error.js';
export { InvalidRoleError } from './domain/errors/invalid-role-error.js';
export { EmailAlreadyInUseError } from './domain/errors/email-already-in-use-error.js';
export { UserAlreadyHasProfileError } from './domain/errors/user-already-has-profile-error.js';
export { ProfessionalProfileNotFoundError } from './domain/errors/professional-profile-not-found-error.js';
export { UserNotFoundError } from './domain/errors/user-not-found-error.js';

// ── Domain Event Contracts ───────────────────────────────────────────────────
// Events are dispatched explicitly by the Application layer (UseCases),
// NOT by aggregates or repositories. See ADR-0009 Official Domain Events Policy.
export { ProfessionalProfileApproved } from './domain/events/professional-profile-approved.js';
export { ProfessionalProfileSuspended } from './domain/events/professional-profile-suspended.js';
export { ProfessionalProfileReactivated } from './domain/events/professional-profile-reactivated.js';
export { ProfessionalProfileBanned } from './domain/events/professional-profile-banned.js';
export { ProfessionalProfileDeactivated } from './domain/events/professional-profile-deactivated.js';
export { ProfessionalProfileClosed } from './domain/events/professional-profile-closed.js';
export { RiskStatusChanged } from './domain/events/risk-status-changed.js';

// ── Repository Interfaces ────────────────────────────────────────────────────
export type { IUserRepository } from './domain/repositories/user-repository.js';
export type { IProfessionalProfileRepository } from './domain/repositories/professional-profile-repository.js';

// ── Application — Ports ─────────────────────────────────────────────────────
export type { IIdentityEventPublisher } from './application/ports/identity-event-publisher-port.js';

// ── Application — Input DTOs ─────────────────────────────────────────────────
export type { CreateUserInputDTO } from './application/dtos/create-user-input-dto.js';
export type { CreateProfessionalProfileInputDTO } from './application/dtos/create-professional-profile-input-dto.js';
export type { ApproveProfessionalProfileInputDTO } from './application/dtos/approve-professional-profile-input-dto.js';
export type { SuspendProfessionalProfileInputDTO } from './application/dtos/suspend-professional-profile-input-dto.js';
export type { ReactivateProfessionalProfileInputDTO } from './application/dtos/reactivate-professional-profile-input-dto.js';
export type { BanProfessionalProfileInputDTO } from './application/dtos/ban-professional-profile-input-dto.js';
export type { DeactivateProfessionalProfileInputDTO } from './application/dtos/deactivate-professional-profile-input-dto.js';
export type { CloseProfessionalProfileInputDTO } from './application/dtos/close-professional-profile-input-dto.js';

// ── Application — Output DTOs ────────────────────────────────────────────────
export type { CreateUserOutputDTO } from './application/dtos/create-user-output-dto.js';
export type { CreateProfessionalProfileOutputDTO } from './application/dtos/create-professional-profile-output-dto.js';
export type { ApproveProfessionalProfileOutputDTO } from './application/dtos/approve-professional-profile-output-dto.js';
export type { SuspendProfessionalProfileOutputDTO } from './application/dtos/suspend-professional-profile-output-dto.js';
export type { ReactivateProfessionalProfileOutputDTO } from './application/dtos/reactivate-professional-profile-output-dto.js';
export type { BanProfessionalProfileOutputDTO } from './application/dtos/ban-professional-profile-output-dto.js';
export type { DeactivateProfessionalProfileOutputDTO } from './application/dtos/deactivate-professional-profile-output-dto.js';
export type { CloseProfessionalProfileOutputDTO } from './application/dtos/close-professional-profile-output-dto.js';

// ── Application — Use Cases ──────────────────────────────────────────────────
export { CreateUser } from './application/use-cases/create-user.js';
export { CreateProfessionalProfile } from './application/use-cases/create-professional-profile.js';
export { ApproveProfessionalProfile } from './application/use-cases/approve-professional-profile.js';
export { SuspendProfessionalProfile } from './application/use-cases/suspend-professional-profile.js';
export { ReactivateProfessionalProfile } from './application/use-cases/reactivate-professional-profile.js';
export { BanProfessionalProfile } from './application/use-cases/ban-professional-profile.js';
export { DeactivateProfessionalProfile } from './application/use-cases/deactivate-professional-profile.js';
export { CloseProfessionalProfile } from './application/use-cases/close-professional-profile.js';
