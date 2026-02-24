import type { EntitlementStatus } from '../../domain/enums/entitlement-status.js';
import type { EntitlementType } from '../../domain/enums/entitlement-type.js';

/**
 * Audit log data for every PlatformEntitlement change (ADR-0027 §2).
 *
 * Action code: `PLATFORM_ENTITLEMENT_CHANGED`
 *
 * - `actorId` / `actorRole` = 'SYSTEM' for automated actions (scheduler,
 *   risk event handler); human actor ID and role for admin-initiated changes.
 * - `previousStatus` / `newStatus` populated on lifecycle transitions.
 * - `addedCapabilities` / `removedCapabilities` populated on capability mutations.
 * - At least one of the above change fields must be non-empty per write.
 */
export interface PlatformEntitlementChangedAuditData {
  actorId: string;
  actorRole: string;
  targetEntityId: string;
  tenantId: string;
  previousStatus?: EntitlementStatus;
  newStatus?: EntitlementStatus;
  addedCapabilities?: EntitlementType[];
  removedCapabilities?: EntitlementType[];
  reason: string;
  occurredAtUtc: string;
}

export interface IPlatformEntitlementAuditLog {
  writePlatformEntitlementChanged(data: PlatformEntitlementChangedAuditData): Promise<void>;
}
