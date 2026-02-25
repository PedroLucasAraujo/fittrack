import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import { ProfessionalProfileDeactivated } from '../../domain/events/professional-profile-deactivated.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { IIdentityEventPublisher } from '../ports/identity-event-publisher-port.js';
import type { DeactivateProfessionalProfileInputDTO } from '../dtos/deactivate-professional-profile-input-dto.js';
import type { DeactivateProfessionalProfileOutputDTO } from '../dtos/deactivate-professional-profile-output-dto.js';

/**
 * Voluntarily deactivates a ProfessionalProfile (ACTIVE → DEACTIVATED).
 *
 * This is a terminal transition initiated by the professional themselves.
 * Per ADR-0008: deactivation does NOT revoke existing AccessGrants. Clients
 * retain access to previously granted services.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class DeactivateProfessionalProfile {
  constructor(
    private readonly profileRepository: IProfessionalProfileRepository,
    private readonly eventPublisher: IIdentityEventPublisher,
  ) {}

  async execute(
    dto: DeactivateProfessionalProfileInputDTO,
  ): Promise<DomainResult<DeactivateProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const previousRiskStatus = profile.riskStatus;

    const result = profile.deactivate();
    if (result.isLeft()) return left(result.value);

    await this.profileRepository.save(profile);

    await this.eventPublisher.publishProfessionalProfileDeactivated(
      new ProfessionalProfileDeactivated(profile.id, profile.id, {
        previousRiskStatus,
      }),
    );

    const deactivatedAtUtc = profile.deactivatedAtUtc;
    /* v8 ignore next 2 */
    if (!deactivatedAtUtc)
      throw new Error('Invariant: deactivatedAtUtc must be set after deactivate()');

    return right({
      profileId: profile.id,
      status: profile.status,
      deactivatedAtUtc: deactivatedAtUtc.toISO(),
    });
  }
}
