import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AccessGrantSuspended } from '../../domain/events/access-grant-suspended.js';
import { AccessGrantNotFoundError } from '../../domain/errors/access-grant-not-found-error.js';
import type { IAccessGrantRepository } from '../../domain/repositories/access-grant-repository.js';
import type { IBillingEventPublisher } from '../ports/billing-event-publisher-port.js';
import type { SuspendAccessGrantInputDTO } from '../dtos/suspend-access-grant-input-dto.js';
import type { SuspendAccessGrantOutputDTO } from '../dtos/suspend-access-grant-output-dto.js';

/**
 * Suspends an ACTIVE AccessGrant (ADR-0022, ADR-0046 §2).
 *
 * Triggered by an operator action when a professional's RiskStatus is moved
 * to WATCHLIST. Per ADR-0022 (canonical): WATCHLIST suspension is always
 * operator-triggered, never automatic.
 *
 * Tenant isolation (ADR-0025): professionalProfileId is sourced from the
 * operator's JWT and must match the grant's owner. Cross-tenant returns
 * NOT_FOUND, never FORBIDDEN.
 */
export class SuspendAccessGrant {
  constructor(
    private readonly accessGrantRepository: IAccessGrantRepository,
    private readonly eventPublisher: IBillingEventPublisher,
  ) {}

  async execute(
    dto: SuspendAccessGrantInputDTO,
  ): Promise<DomainResult<SuspendAccessGrantOutputDTO>> {
    const grantIdResult = UniqueEntityId.create(dto.accessGrantId);
    if (grantIdResult.isLeft()) return left(grantIdResult.value);

    const grant = await this.accessGrantRepository.findById(grantIdResult.value);

    // Tenant isolation: treat cross-tenant as not-found (ADR-0025)
    if (!grant || grant.professionalProfileId !== dto.professionalProfileId) {
      return left(new AccessGrantNotFoundError(dto.accessGrantId));
    }

    const suspendResult = grant.suspend();
    if (suspendResult.isLeft()) return left(suspendResult.value);

    await this.accessGrantRepository.save(grant);

    const suspendedAtUtc = grant.suspendedAtUtc;
    /* v8 ignore next */
    if (!suspendedAtUtc) throw new Error('Invariant: suspendedAtUtc must be set after suspend()');

    await this.eventPublisher.publishAccessGrantSuspended(
      new AccessGrantSuspended(grant.id, grant.professionalProfileId, {
        transactionId: grant.transactionId,
      }),
    );

    return right({
      accessGrantId: grant.id,
      accessGrantStatus: grant.status,
      suspendedAtUtc: suspendedAtUtc.toISO(),
    });
  }
}
