import type { IRepository } from '@fittrack/core';
import type { AccessGrant } from '../aggregates/access-grant.js';

export interface IAccessGrantRepository extends IRepository<AccessGrant> {
  findByTransactionId(transactionId: string): Promise<AccessGrant | null>;
  /**
   * Returns the first ACTIVE AccessGrant matching the given tuple.
   *
   * Used by the 5-point validity check (ADR-0046 §3) before Execution or
   * Booking creation. Returns null if no grant exists or no grant is ACTIVE.
   */
  findActiveByClientAndProfessionalAndPlan(
    clientId: string,
    professionalProfileId: string,
    servicePlanId: string,
  ): Promise<AccessGrant | null>;
}
