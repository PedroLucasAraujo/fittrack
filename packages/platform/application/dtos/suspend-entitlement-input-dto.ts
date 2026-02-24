export interface SuspendEntitlementInputDTO {
  professionalProfileId: string;
  reason: string;
  actorId: string;
  actorRole: string;
  /** Risk event ID or null for admin-initiated suspension. */
  evidenceRef?: string | null;
}
