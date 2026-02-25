import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import { ProfessionalProfileApproved } from '../../domain/events/professional-profile-approved.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { IIdentityEventPublisher } from '../ports/identity-event-publisher-port.js';
import type { ApproveProfessionalProfileInputDTO } from '../dtos/approve-professional-profile-input-dto.js';
import type { ApproveProfessionalProfileOutputDTO } from '../dtos/approve-professional-profile-output-dto.js';

/**
 * Approves a ProfessionalProfile (PENDING_APPROVAL → ACTIVE).
 *
 * Once approved, the professional can operate on the platform: accept
 * sales, create bookings, and record executions.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class ApproveProfessionalProfile {
  constructor(
    private readonly profileRepository: IProfessionalProfileRepository,
    private readonly eventPublisher: IIdentityEventPublisher,
  ) {}

  async execute(
    dto: ApproveProfessionalProfileInputDTO,
  ): Promise<DomainResult<ApproveProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const result = profile.approve();
    if (result.isLeft()) return left(result.value);

    await this.profileRepository.save(profile);

    await this.eventPublisher.publishProfessionalProfileApproved(
      new ProfessionalProfileApproved(profile.id, profile.id, {
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
