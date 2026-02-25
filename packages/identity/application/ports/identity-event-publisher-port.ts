import type { ProfessionalProfileApproved } from '../../domain/events/professional-profile-approved.js';
import type { ProfessionalProfileSuspended } from '../../domain/events/professional-profile-suspended.js';
import type { ProfessionalProfileReactivated } from '../../domain/events/professional-profile-reactivated.js';
import type { ProfessionalProfileBanned } from '../../domain/events/professional-profile-banned.js';
import type { ProfessionalProfileDeactivated } from '../../domain/events/professional-profile-deactivated.js';
import type { ProfessionalProfileClosed } from '../../domain/events/professional-profile-closed.js';

/**
 * Event publisher port for the Identity bounded context.
 *
 * All ProfessionalProfile lifecycle transitions emit their corresponding
 * domain event after the aggregate is persisted (ADR-0009 §4 post-commit
 * dispatch rule). The infrastructure adapter routes events to the
 * configured event bus.
 */
export interface IIdentityEventPublisher {
  publishProfessionalProfileApproved(event: ProfessionalProfileApproved): Promise<void>;
  publishProfessionalProfileSuspended(event: ProfessionalProfileSuspended): Promise<void>;
  publishProfessionalProfileReactivated(event: ProfessionalProfileReactivated): Promise<void>;
  publishProfessionalProfileBanned(event: ProfessionalProfileBanned): Promise<void>;
  publishProfessionalProfileDeactivated(event: ProfessionalProfileDeactivated): Promise<void>;
  publishProfessionalProfileClosed(event: ProfessionalProfileClosed): Promise<void>;
}
