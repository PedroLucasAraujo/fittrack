import type { PlatformEntitlement } from '../aggregates/platform-entitlement.js';

/**
 * Repository interface for PlatformEntitlement aggregate (ADR-0047 §7).
 *
 * Infrastructure adapters implement this against the Billing/Platform schema.
 * The domain layer has zero infrastructure dependencies.
 */
export interface IPlatformEntitlementRepository {
  findById(id: string, professionalProfileId: string): Promise<PlatformEntitlement | null>;
  findByProfessionalProfileId(professionalProfileId: string): Promise<PlatformEntitlement | null>;
  save(entitlement: PlatformEntitlement): Promise<void>;

  /**
   * Returns all entitlements whose `expiresAt` is non-null and earlier than
   * `asOfUtc`, filtered to those with `status === ACTIVE` (ADR-0022: no
   * terminal-state records returned to the scheduler).
   *
   * `asOfUtc` must be a UTC ISO 8601 string (ADR-0010 §2).
   * Called by the scheduled expiration job (ADR-0054).
   */
  findExpiredEntitlements(asOfUtc: string): Promise<PlatformEntitlement[]>;
}
