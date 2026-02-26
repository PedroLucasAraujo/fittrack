import type { IBillingEventPublisher } from '../../application/ports/billing-event-publisher-port.js';
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

export class InMemoryBillingEventPublisherStub implements IBillingEventPublisher {
  public publishedServicePlanActivated: ServicePlanActivated[] = [];
  public publishedServicePlanArchived: ServicePlanArchived[] = [];
  public publishedPurchaseCompleted: PurchaseCompleted[] = [];
  public publishedPaymentFailed: PaymentFailed[] = [];
  public publishedPaymentRefunded: PaymentRefunded[] = [];
  public publishedChargebackRegistered: ChargebackRegistered[] = [];
  public publishedAccessGrantCreated: AccessGrantCreated[] = [];
  public publishedAccessGrantSuspended: AccessGrantSuspended[] = [];
  public publishedAccessGrantReinstated: AccessGrantReinstated[] = [];
  public publishedAccessGrantRevoked: AccessGrantRevoked[] = [];

  async publishServicePlanActivated(event: ServicePlanActivated): Promise<void> {
    this.publishedServicePlanActivated.push(event);
  }

  async publishServicePlanArchived(event: ServicePlanArchived): Promise<void> {
    this.publishedServicePlanArchived.push(event);
  }

  async publishPurchaseCompleted(event: PurchaseCompleted): Promise<void> {
    this.publishedPurchaseCompleted.push(event);
  }

  async publishPaymentFailed(event: PaymentFailed): Promise<void> {
    this.publishedPaymentFailed.push(event);
  }

  async publishPaymentRefunded(event: PaymentRefunded): Promise<void> {
    this.publishedPaymentRefunded.push(event);
  }

  async publishChargebackRegistered(event: ChargebackRegistered): Promise<void> {
    this.publishedChargebackRegistered.push(event);
  }

  async publishAccessGrantCreated(event: AccessGrantCreated): Promise<void> {
    this.publishedAccessGrantCreated.push(event);
  }

  async publishAccessGrantSuspended(event: AccessGrantSuspended): Promise<void> {
    this.publishedAccessGrantSuspended.push(event);
  }

  async publishAccessGrantReinstated(event: AccessGrantReinstated): Promise<void> {
    this.publishedAccessGrantReinstated.push(event);
  }

  async publishAccessGrantRevoked(event: AccessGrantRevoked): Promise<void> {
    this.publishedAccessGrantRevoked.push(event);
  }
}
