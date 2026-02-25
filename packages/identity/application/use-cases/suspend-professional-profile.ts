import { left, right } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ProfessionalProfileNotFoundError } from '../../domain/errors/professional-profile-not-found-error.js';
import { ProfessionalProfileSuspended } from '../../domain/events/professional-profile-suspended.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { IIdentityEventPublisher } from '../ports/identity-event-publisher-port.js';
import type { SuspendProfessionalProfileInputDTO } from '../dtos/suspend-professional-profile-input-dto.js';
import type { SuspendProfessionalProfileOutputDTO } from '../dtos/suspend-professional-profile-output-dto.js';

/**
 * Suspends a ProfessionalProfile (ACTIVE → SUSPENDED).
 *
 * While suspended, the professional cannot accept new bookings. Existing
 * data is retained and AccessGrants are not affected.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class SuspendProfessionalProfile {
  constructor(
    private readonly profileRepository: IProfessionalProfileRepository,
    private readonly eventPublisher: IIdentityEventPublisher,
  ) {}

  async execute(
    dto: SuspendProfessionalProfileInputDTO,
  ): Promise<DomainResult<SuspendProfessionalProfileOutputDTO>> {
    const idResult = UniqueEntityId.create(dto.professionalProfileId);
    if (idResult.isLeft()) return left(idResult.value);

    const profile = await this.profileRepository.findById(idResult.value);
    if (!profile) {
      return left(new ProfessionalProfileNotFoundError(dto.professionalProfileId));
    }

    const result = profile.suspend();
    if (result.isLeft()) return left(result.value);

    await this.profileRepository.save(profile);

    await this.eventPublisher.publishProfessionalProfileSuspended(
      new ProfessionalProfileSuspended(profile.id, profile.id, {
        profileId: profile.id,
        userId: profile.userId,
      }),
    );

    const suspendedAtUtc = profile.suspendedAtUtc;
    /* v8 ignore next 2 */
    if (!suspendedAtUtc) throw new Error('Invariant: suspendedAtUtc must be set after suspend()');

    return right({
      profileId: profile.id,
      status: profile.status,
      suspendedAtUtc: suspendedAtUtc.toISO(),
    });
  }
}
