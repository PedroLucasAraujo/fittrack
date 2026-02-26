import type { AccessGrantCreated } from '../../domain/events/access-grant-created.js';
import type { AccessGrantReinstated } from '../../domain/events/access-grant-reinstated.js';
import type { AccessGrantRevoked } from '../../domain/events/access-grant-revoked.js';
import type { AccessGrantSuspended } from '../../domain/events/access-grant-suspended.js';
import type { ChargebackRegistered } from '../../domain/events/chargeback-registered.js';
import type { PaymentFailed } from '../../domain/events/payment-failed.js';
import type { PaymentRefunded } from '../../domain/events/payment-refunded.js';
import type { PurchaseCompleted } from '../../domain/events/purchase-completed.js';
import type { ServicePlanActivated } from '../../domain/events/service-plan-activated.js';
import type { ServicePlanArchived } from '../../domain/events/service-plan-archived.js';

/**
 * Event publisher port for the Billing bounded context.
 *
 * Every significant state transition in Billing emits its corresponding
 * domain event after the aggregate is persisted (ADR-0009 §4 post-commit
 * dispatch rule). The infrastructure adapter routes events to the
 * configured event bus / outbox table (ADR-0016).
 */
export interface IBillingEventPublisher {
  // ── ServicePlan events ──────────────────────────────────────────────────
  publishServicePlanActivated(event: ServicePlanActivated): Promise<void>;
  publishServicePlanArchived(event: ServicePlanArchived): Promise<void>;

  // ── Transaction events ──────────────────────────────────────────────────
  publishPurchaseCompleted(event: PurchaseCompleted): Promise<void>;
  publishPaymentFailed(event: PaymentFailed): Promise<void>;
  publishPaymentRefunded(event: PaymentRefunded): Promise<void>;
  publishChargebackRegistered(event: ChargebackRegistered): Promise<void>;

  // ── AccessGrant events ──────────────────────────────────────────────────
  publishAccessGrantCreated(event: AccessGrantCreated): Promise<void>;
  publishAccessGrantSuspended(event: AccessGrantSuspended): Promise<void>;
  publishAccessGrantReinstated(event: AccessGrantReinstated): Promise<void>;
  publishAccessGrantRevoked(event: AccessGrantRevoked): Promise<void>;
}
