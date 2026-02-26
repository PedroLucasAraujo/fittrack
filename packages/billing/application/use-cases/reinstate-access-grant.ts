import { left, right, UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { AccessGrantReinstated } from '../../domain/events/access-grant-reinstated.js';
import { AccessGrantNotFoundError } from '../../domain/errors/access-grant-not-found-error.js';
import type { IAccessGrantRepository } from '../../domain/repositories/access-grant-repository.js';
import type { IBillingEventPublisher } from '../ports/billing-event-publisher-port.js';
import type { ReinstateAccessGrantInputDTO } from '../dtos/reinstate-access-grant-input-dto.js';
import type { ReinstateAccessGrantOutputDTO } from '../dtos/reinstate-access-grant-output-dto.js';

/**
 * Reinstates a SUSPENDED AccessGrant back to ACTIVE (ADR-0022, ADR-0046 §2).
 *
 * Triggered by an operator action when a professional's RiskStatus is moved
 * back to NORMAL from WATCHLIST. Per ADR-0022 (canonical): BANNED is terminal
 * and cannot be reversed via reinstatement; only WATCHLIST grants are eligible.
 *
 * Tenant isolation (ADR-0025): professionalProfileId is sourced from the
 * operator's JWT and must match the grant's owner. Cross-tenant returns
 * NOT_FOUND, never FORBIDDEN.
 */
export class ReinstateAccessGrant {
  constructor(
    private readonly accessGrantRepository: IAccessGrantRepository,
    private readonly eventPublisher: IBillingEventPublisher,
  ) {}

  async execute(
    dto: ReinstateAccessGrantInputDTO,
  ): Promise<DomainResult<ReinstateAccessGrantOutputDTO>> {
    const grantIdResult = UniqueEntityId.create(dto.accessGrantId);
    if (grantIdResult.isLeft()) return left(grantIdResult.value);

    const grant = await this.accessGrantRepository.findById(grantIdResult.value);

    // Tenant isolation: treat cross-tenant as not-found (ADR-0025)
    if (!grant || grant.professionalProfileId !== dto.professionalProfileId) {
      return left(new AccessGrantNotFoundError(dto.accessGrantId));
    }

    const reinstateResult = grant.reinstate();
    if (reinstateResult.isLeft()) return left(reinstateResult.value);

    await this.accessGrantRepository.save(grant);

    await this.eventPublisher.publishAccessGrantReinstated(
      new AccessGrantReinstated(grant.id, grant.professionalProfileId, {
        transactionId: grant.transactionId,
      }),
    );

    return right({
      accessGrantId: grant.id,
      accessGrantStatus: grant.status,
    });
  }
}
