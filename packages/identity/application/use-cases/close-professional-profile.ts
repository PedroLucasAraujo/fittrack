import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import { ProfessionalProfileClosed } from '../../domain/events/professional-profile-closed.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { IIdentityEventPublisher } from '../ports/identity-event-publisher-port.js';
import type { CloseProfessionalProfileInputDTO } from '../dtos/close-professional-profile-input-dto.js';
import type { CloseProfessionalProfileOutputDTO } from '../dtos/close-professional-profile-output-dto.js';

/**
 * Formally closes a ProfessionalProfile (ACTIVE | SUSPENDED → CLOSED).
 *
 * This is an administrative or system-initiated terminal transition,
 * distinct from deactivate() (voluntary) and ban() (punitive).
 *
 * Per ADR-0013 Extension: closure does NOT revoke existing AccessGrants.
 * Clients retain access to previously granted Deliverables.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class CloseProfessionalProfile {
  constructor(
    private readonly profileRepository: IProfessionalProfileRepository,
    private readonly eventPublisher: IIdentityEventPublisher,
  ) {}

  async execute(
    dto: CloseProfessionalProfileInputDTO,
  ): Promise<DomainResult<CloseProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const previousStatus = profile.status;

    const result = profile.close(dto.reason);
    if (result.isLeft()) return left(result.value);

    await this.profileRepository.save(profile);

    await this.eventPublisher.publishProfessionalProfileClosed(
      new ProfessionalProfileClosed(profile.id, profile.id, {
        previousStatus,
        previousRiskStatus: profile.riskStatus,
        reason: dto.reason,
      }),
    );

    const closedAtUtc = profile.closedAtUtc;
    /* v8 ignore next 2 */
    if (!closedAtUtc) throw new Error('Invariant: closedAtUtc must be set after close()');

    return right({
      profileId: profile.id,
      status: profile.status,
      closedAtUtc: closedAtUtc.toISO(),
      closedReason: dto.reason,
    });
  }
}
