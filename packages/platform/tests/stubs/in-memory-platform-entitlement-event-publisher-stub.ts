import type { IPlatformEntitlementEventPublisher } from '../../application/ports/platform-entitlement-event-publisher-port.js';
import type { EntitlementGranted } from '../../domain/events/entitlement-granted.js';
import type { EntitlementCapabilityAdded } from '../../domain/events/entitlement-capability-added.js';
import type { EntitlementCapabilityRemoved } from '../../domain/events/entitlement-capability-removed.js';
import type { EntitlementSuspended } from '../../domain/events/entitlement-suspended.js';
import type { EntitlementReinstated } from '../../domain/events/entitlement-reinstated.js';
import type { EntitlementExpired } from '../../domain/events/entitlement-expired.js';

export class InMemoryPlatformEntitlementEventPublisherStub
  implements IPlatformEntitlementEventPublisher
{
  public publishedEntitlementGranted: EntitlementGranted[] = [];
  public publishedCapabilityAdded: EntitlementCapabilityAdded[] = [];
  public publishedCapabilityRemoved: EntitlementCapabilityRemoved[] = [];
  public publishedEntitlementSuspended: EntitlementSuspended[] = [];
  public publishedEntitlementReinstated: EntitlementReinstated[] = [];
  public publishedEntitlementExpired: EntitlementExpired[] = [];

  async publishEntitlementGranted(event: EntitlementGranted): Promise<void> {
    this.publishedEntitlementGranted.push(event);
  }

  async publishCapabilityAdded(event: EntitlementCapabilityAdded): Promise<void> {
    this.publishedCapabilityAdded.push(event);
  }

  async publishCapabilityRemoved(event: EntitlementCapabilityRemoved): Promise<void> {
    this.publishedCapabilityRemoved.push(event);
  }

  async publishEntitlementSuspended(event: EntitlementSuspended): Promise<void> {
    this.publishedEntitlementSuspended.push(event);
  }

  async publishEntitlementReinstated(event: EntitlementReinstated): Promise<void> {
    this.publishedEntitlementReinstated.push(event);
  }

  async publishEntitlementExpired(event: EntitlementExpired): Promise<void> {
    this.publishedEntitlementExpired.push(event);
  }
}
