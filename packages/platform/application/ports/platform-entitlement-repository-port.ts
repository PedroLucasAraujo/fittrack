import type { PlatformEntitlement } from '../../domain/aggregates/platform-entitlement.js';

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
}
