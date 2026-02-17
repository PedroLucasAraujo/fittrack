import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { BanProfessionalProfileInputDTO } from '../dtos/ban-professional-profile-input-dto.js';
import type { BanProfessionalProfileOutputDTO } from '../dtos/ban-professional-profile-output-dto.js';

/**
 * Bans a ProfessionalProfile (terminal state).
 *
 * Sets both profile status and riskStatus to BANNED (ADR-0008 §3, ADR-0022).
 * Per project invariant: banning does NOT revoke existing AccessGrants or
 * delete historical Execution records.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class BanProfessionalProfile {
  constructor(private readonly profileRepository: IProfessionalProfileRepository) {}

  async execute(
    dto: BanProfessionalProfileInputDTO,
  ): Promise<DomainResult<BanProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const banResult = profile.ban(dto.reason);
    if (banResult.isLeft()) return left(banResult.value);

    await this.profileRepository.save(profile);

    const bannedAtUtc = profile.bannedAtUtc;
    /* v8 ignore next */
    if (!bannedAtUtc) throw new Error('Invariant: bannedAtUtc must be set after ban()');

    return right({
      profileId: profile.id,
      status: profile.status,
      riskStatus: profile.riskStatus,
      bannedAtUtc: bannedAtUtc.toISO(),
    });
  }
}
