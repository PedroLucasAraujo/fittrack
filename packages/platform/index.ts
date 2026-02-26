// ── Domain — Enums ────────────────────────────────────────────────────────────
export { EntitlementStatus } from './domain/enums/entitlement-status.js';
export { EntitlementType } from './domain/enums/entitlement-type.js';

// ── Domain — Errors ───────────────────────────────────────────────────────────
export { PlatformErrorCodes } from './domain/errors/platform-error-codes.js';
export type { PlatformErrorCode } from './domain/errors/platform-error-codes.js';
export { EntitlementNotFoundError } from './domain/errors/entitlement-not-found-error.js';
export { InvalidEntitlementTransitionError } from './domain/errors/invalid-entitlement-transition-error.js';

// ── Domain — Aggregate ────────────────────────────────────────────────────────
export { PlatformEntitlement } from './domain/aggregates/platform-entitlement.js';
export type { PlatformEntitlementProps } from './domain/aggregates/platform-entitlement.js';

// ── Domain — Events ───────────────────────────────────────────────────────────
export { EntitlementGranted } from './domain/events/entitlement-granted.js';
export { EntitlementCapabilityAdded } from './domain/events/entitlement-capability-added.js';
export { EntitlementCapabilityRemoved } from './domain/events/entitlement-capability-removed.js';
export { EntitlementSuspended } from './domain/events/entitlement-suspended.js';
export { EntitlementReinstated } from './domain/events/entitlement-reinstated.js';
export { EntitlementExpired } from './domain/events/entitlement-expired.js';

// ── Domain — Repository ───────────────────────────────────────────────────────
export type { IPlatformEntitlementRepository } from './domain/repositories/platform-entitlement-repository.js';

// ── Application — Ports ───────────────────────────────────────────────────────
export type { IPlatformEntitlementEventPublisher } from './application/ports/platform-entitlement-event-publisher-port.js';
export type {
  IPlatformEntitlementAuditLog,
  PlatformEntitlementChangedAuditData,
} from './application/ports/platform-entitlement-audit-log-port.js';

// ── Application — DTOs ────────────────────────────────────────────────────────
export type { GrantEntitlementsInputDTO } from './application/dtos/grant-entitlements-input-dto.js';
export type { AddCapabilityInputDTO } from './application/dtos/add-capability-input-dto.js';
export type { RemoveCapabilityInputDTO } from './application/dtos/remove-capability-input-dto.js';
export type { SuspendEntitlementInputDTO } from './application/dtos/suspend-entitlement-input-dto.js';
export type { ReinstateEntitlementInputDTO } from './application/dtos/reinstate-entitlement-input-dto.js';
export type { ExpireEntitlementInputDTO } from './application/dtos/expire-entitlement-input-dto.js';

// ── Application — Use Cases ───────────────────────────────────────────────────
export { GrantEntitlements } from './application/use-cases/grant-entitlements.js';
export { AddCapability } from './application/use-cases/add-capability.js';
export { RemoveCapability } from './application/use-cases/remove-capability.js';
export { SuspendEntitlement } from './application/use-cases/suspend-entitlement.js';
export { ReinstateEntitlement } from './application/use-cases/reinstate-entitlement.js';
export { ExpireEntitlement } from './application/use-cases/expire-entitlement.js';
