import type { EntitlementGranted } from '../../domain/events/entitlement-granted.js';
import type { EntitlementCapabilityAdded } from '../../domain/events/entitlement-capability-added.js';
import type { EntitlementCapabilityRemoved } from '../../domain/events/entitlement-capability-removed.js';
import type { EntitlementSuspended } from '../../domain/events/entitlement-suspended.js';
import type { EntitlementReinstated } from '../../domain/events/entitlement-reinstated.js';
import type { EntitlementExpired } from '../../domain/events/entitlement-expired.js';

/**
 * Event publisher port for the Platform bounded context.
 *
 * Published post-commit (ADR-0009 §4). Each use case uses only the relevant
 * publish method.
 */
export interface IPlatformEntitlementEventPublisher {
  publishEntitlementGranted(event: EntitlementGranted): Promise<void>;
  publishCapabilityAdded(event: EntitlementCapabilityAdded): Promise<void>;
  publishCapabilityRemoved(event: EntitlementCapabilityRemoved): Promise<void>;
  publishEntitlementSuspended(event: EntitlementSuspended): Promise<void>;
  publishEntitlementReinstated(event: EntitlementReinstated): Promise<void>;
  publishEntitlementExpired(event: EntitlementExpired): Promise<void>;
}
