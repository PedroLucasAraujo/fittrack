import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { CloseProfessionalProfileInputDTO } from '../dtos/close-professional-profile-input-dto.js';
import type { CloseProfessionalProfileOutputDTO } from '../dtos/close-professional-profile-output-dto.js';

/**
 * Voluntarily deactivates (closes) a ProfessionalProfile.
 *
 * Transitions from ACTIVE → DEACTIVATED (terminal). Per project invariant
 * and ADR-0008: deactivation does NOT revoke existing AccessGrants. Clients
 * retain access to previously granted services.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class CloseProfessionalProfile {
  constructor(private readonly profileRepository: IProfessionalProfileRepository) {}

  async execute(
    dto: CloseProfessionalProfileInputDTO,
  ): Promise<DomainResult<CloseProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const result = profile.deactivate();
    if (result.isLeft()) return left(result.value);

    await this.profileRepository.save(profile);

    const deactivatedAtUtc = profile.deactivatedAtUtc;
    /* v8 ignore next */
    if (!deactivatedAtUtc)
      throw new Error('Invariant: deactivatedAtUtc must be set after deactivate()');

    return right({
      profileId: profile.id,
      status: profile.status,
      deactivatedAtUtc: deactivatedAtUtc.toISO(),
    });
  }
}
