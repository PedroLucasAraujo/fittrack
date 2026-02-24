export interface ExpireEntitlementInputDTO {
  /** The specific entitlement to expire (scheduler knows its ID). */
  entitlementId: string;
  /** Tenant scope — required for ADR-0025 tenant isolation on the repository lookup. */
  professionalProfileId: string;
}
