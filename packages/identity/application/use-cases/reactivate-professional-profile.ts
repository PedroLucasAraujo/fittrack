import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import { ProfessionalProfileReactivated } from '../../domain/events/professional-profile-reactivated.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { IIdentityEventPublisher } from '../ports/identity-event-publisher-port.js';
import type { ReactivateProfessionalProfileInputDTO } from '../dtos/reactivate-professional-profile-input-dto.js';
import type { ReactivateProfessionalProfileOutputDTO } from '../dtos/reactivate-professional-profile-output-dto.js';

/**
 * Reactivates a suspended ProfessionalProfile (SUSPENDED → ACTIVE).
 *
 * Clears the suspendedAtUtc timestamp. The professional may resume
 * operations on the platform.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class ReactivateProfessionalProfile {
  constructor(
    private readonly profileRepository: IProfessionalProfileRepository,
    private readonly eventPublisher: IIdentityEventPublisher,
  ) {}

  async execute(
    dto: ReactivateProfessionalProfileInputDTO,
  ): Promise<DomainResult<ReactivateProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const result = profile.reactivate();
    if (result.isLeft()) return left(result.value);

    await this.profileRepository.save(profile);

    await this.eventPublisher.publishProfessionalProfileReactivated(
      new ProfessionalProfileReactivated(profile.id, profile.id, {
        profileId: profile.id,
        userId: profile.userId,
      }),
    );

    return right({
      profileId: profile.id,
      status: profile.status,
    });
  }
}
