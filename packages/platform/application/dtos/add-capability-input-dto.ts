import type { EntitlementType } from '../../domain/enums/entitlement-type.js';

export interface AddCapabilityInputDTO {
  professionalProfileId: string;
  capability: EntitlementType;
  reason: string;
  actorId: string;
  actorRole: string;
}
