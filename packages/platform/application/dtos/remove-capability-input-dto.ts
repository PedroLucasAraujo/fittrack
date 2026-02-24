import type { EntitlementType } from '../../domain/enums/entitlement-type.js';

export interface RemoveCapabilityInputDTO {
  professionalProfileId: string;
  capability: EntitlementType;
  reason: string;
  actorId: string;
  actorRole: string;
}
