// ── Enums ────────────────────────────────────────────────────────────────────
export { ServicePlanStatus } from './domain/enums/service-plan-status.js';
export { TransactionStatus } from './domain/enums/transaction-status.js';
export { AccessGrantStatus } from './domain/enums/access-grant-status.js';
export { PlanType } from './domain/enums/plan-type.js';

// ── Value Objects ────────────────────────────────────────────────────────────
export { PlatformFee } from './domain/value-objects/platform-fee.js';

// ── Errors ───────────────────────────────────────────────────────────────────
export { BillingErrorCodes } from './domain/errors/billing-error-codes.js';
export type { BillingErrorCode } from './domain/errors/billing-error-codes.js';
export { InvalidServicePlanError } from './domain/errors/invalid-service-plan-error.js';
export { InvalidServicePlanTransitionError } from './domain/errors/invalid-service-plan-transition-error.js';
export { InvalidTransactionTransitionError } from './domain/errors/invalid-transaction-transition-error.js';
export { InvalidAccessGrantTransitionError } from './domain/errors/invalid-access-grant-transition-error.js';
export { InvalidPlatformFeeError } from './domain/errors/invalid-platform-fee-error.js';
export { ServicePlanNotFoundError } from './domain/errors/service-plan-not-found-error.js';
export { TransactionNotFoundError } from './domain/errors/transaction-not-found-error.js';
export { AccessGrantNotFoundError } from './domain/errors/access-grant-not-found-error.js';
export { AccessGrantExpiredError } from './domain/errors/access-grant-expired-error.js';
export { AccessGrantSuspendedError } from './domain/errors/access-grant-suspended-error.js';
export { AccessGrantRevokedError } from './domain/errors/access-grant-revoked-error.js';
export { TransactionNotConfirmedError } from './domain/errors/transaction-not-confirmed-error.js';
export { ServicePlanNotActiveError } from './domain/errors/service-plan-not-active-error.js';

// ── Domain Event Contracts ───────────────────────────────────────────────────
// Events are dispatched explicitly by the Application layer (UseCases),
// NOT by aggregates or repositories. See ADR-0009 Official Domain Events Policy.
export { PurchaseCompleted } from './domain/events/purchase-completed.js';
export { PaymentFailed } from './domain/events/payment-failed.js';
export { PaymentRefunded } from './domain/events/payment-refunded.js';
export { ChargebackRegistered } from './domain/events/chargeback-registered.js';
export { AccessGrantCreated } from './domain/events/access-grant-created.js';
export { AccessGrantRevoked } from './domain/events/access-grant-revoked.js';
export { AccessGrantSuspended } from './domain/events/access-grant-suspended.js';
export { AccessGrantReinstated } from './domain/events/access-grant-reinstated.js';
export { ServicePlanActivated } from './domain/events/service-plan-activated.js';
export { ServicePlanArchived } from './domain/events/service-plan-archived.js';

// ── Repository Interfaces ────────────────────────────────────────────────────
export type { IServicePlanRepository } from './domain/repositories/service-plan-repository.js';
export type { ITransactionRepository } from './domain/repositories/transaction-repository.js';
export type { IAccessGrantRepository } from './domain/repositories/access-grant-repository.js';

// ── Application — Input DTOs ─────────────────────────────────────────────────
export type { CreateServicePlanInputDTO } from './application/dtos/create-service-plan-input-dto.js';
export type { ActivateServicePlanInputDTO } from './application/dtos/activate-service-plan-input-dto.js';
export type { ArchiveServicePlanInputDTO } from './application/dtos/archive-service-plan-input-dto.js';
export type { InitiatePurchaseInputDTO } from './application/dtos/initiate-purchase-input-dto.js';
export type { ConfirmPaymentInputDTO } from './application/dtos/confirm-payment-input-dto.js';
export type { RegisterChargebackInputDTO } from './application/dtos/register-chargeback-input-dto.js';
export type { SuspendAccessGrantInputDTO } from './application/dtos/suspend-access-grant-input-dto.js';
export type { ReinstateAccessGrantInputDTO } from './application/dtos/reinstate-access-grant-input-dto.js';
export type { RefundPaymentInputDTO } from './application/dtos/refund-payment-input-dto.js';

// ── Application — Output DTOs ────────────────────────────────────────────────
export type { CreateServicePlanOutputDTO } from './application/dtos/create-service-plan-output-dto.js';
export type { ActivateServicePlanOutputDTO } from './application/dtos/activate-service-plan-output-dto.js';
export type { ArchiveServicePlanOutputDTO } from './application/dtos/archive-service-plan-output-dto.js';
export type { InitiatePurchaseOutputDTO } from './application/dtos/initiate-purchase-output-dto.js';
export type { ConfirmPaymentOutputDTO } from './application/dtos/confirm-payment-output-dto.js';
export type { RegisterChargebackOutputDTO } from './application/dtos/register-chargeback-output-dto.js';
export type { SuspendAccessGrantOutputDTO } from './application/dtos/suspend-access-grant-output-dto.js';
export type { ReinstateAccessGrantOutputDTO } from './application/dtos/reinstate-access-grant-output-dto.js';
export type { RefundPaymentOutputDTO } from './application/dtos/refund-payment-output-dto.js';

// ── Application — Use Cases ──────────────────────────────────────────────────
export { CreateServicePlan } from './application/use-cases/create-service-plan.js';
export { ActivateServicePlan } from './application/use-cases/activate-service-plan.js';
export { ArchiveServicePlan } from './application/use-cases/archive-service-plan.js';
export { InitiatePurchase } from './application/use-cases/initiate-purchase.js';
export { ConfirmPayment } from './application/use-cases/confirm-payment.js';
export { RegisterChargeback } from './application/use-cases/register-chargeback.js';
export { SuspendAccessGrant } from './application/use-cases/suspend-access-grant.js';
export { ReinstateAccessGrant } from './application/use-cases/reinstate-access-grant.js';
export { RefundPayment } from './application/use-cases/refund-payment.js';
