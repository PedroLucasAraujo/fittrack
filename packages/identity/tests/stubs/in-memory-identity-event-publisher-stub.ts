import type { IIdentityEventPublisher } from '../../application/ports/identity-event-publisher-port.js';
import type { ProfessionalProfileApproved } from '../../domain/events/professional-profile-approved.js';
import type { ProfessionalProfileSuspended } from '../../domain/events/professional-profile-suspended.js';
import type { ProfessionalProfileReactivated } from '../../domain/events/professional-profile-reactivated.js';
import type { ProfessionalProfileBanned } from '../../domain/events/professional-profile-banned.js';
import type { ProfessionalProfileDeactivated } from '../../domain/events/professional-profile-deactivated.js';
import type { ProfessionalProfileClosed } from '../../domain/events/professional-profile-closed.js';

export class InMemoryIdentityEventPublisherStub implements IIdentityEventPublisher {
  public publishedApproved: ProfessionalProfileApproved[] = [];
  public publishedSuspended: ProfessionalProfileSuspended[] = [];
  public publishedReactivated: ProfessionalProfileReactivated[] = [];
  public publishedBanned: ProfessionalProfileBanned[] = [];
  public publishedDeactivated: ProfessionalProfileDeactivated[] = [];
  public publishedClosed: ProfessionalProfileClosed[] = [];

  async publishProfessionalProfileApproved(event: ProfessionalProfileApproved): Promise<void> {
    this.publishedApproved.push(event);
  }

  async publishProfessionalProfileSuspended(event: ProfessionalProfileSuspended): Promise<void> {
    this.publishedSuspended.push(event);
  }

  async publishProfessionalProfileReactivated(
    event: ProfessionalProfileReactivated,
  ): Promise<void> {
    this.publishedReactivated.push(event);
  }

  async publishProfessionalProfileBanned(event: ProfessionalProfileBanned): Promise<void> {
    this.publishedBanned.push(event);
  }

  async publishProfessionalProfileDeactivated(
    event: ProfessionalProfileDeactivated,
  ): Promise<void> {
    this.publishedDeactivated.push(event);
  }

  async publishProfessionalProfileClosed(event: ProfessionalProfileClosed): Promise<void> {
    this.publishedClosed.push(event);
  }
}
