import type { EntitlementType } from '../../domain/enums/entitlement-type.js';

export interface GrantEntitlementsInputDTO {
  professionalProfileId: string;
  /** Non-empty list of capabilities to grant. Duplicates are ignored. */
  entitlements: EntitlementType[];
  /** ISO 8601 UTC expiry; omit or pass null for no expiry. */
  expiresAt?: string | null;
  /** Non-empty reason (≤500 chars) for audit trail. */
  reason: string;
  actorId: string;
  actorRole: string;
}
