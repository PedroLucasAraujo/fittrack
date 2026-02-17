import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { UniqueEntityId } from '@fittrack/core';
import { PersonName } from '../../domain/value-objects/person-name.js';
import { ProfessionalProfile } from '../../domain/aggregates/professional-profile.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found-error.js';
import { UserAlreadyHasProfileError } from '../../domain/errors/user-already-has-profile-error.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import type { IProfessionalProfileRepository } from '../../domain/repositories/professional-profile-repository.js';
import type { CreateProfessionalProfileInputDTO } from '../dtos/create-professional-profile-input-dto.js';
import type { CreateProfessionalProfileOutputDTO } from '../dtos/create-professional-profile-output-dto.js';

/**
 * Creates a ProfessionalProfile linked to an existing User.
 *
 * Validates that the User exists and does not already have a profile.
 * The profile starts in PENDING_APPROVAL with NORMAL riskStatus.
 * Returns an Output DTO — never exposes the aggregate.
 */
export class CreateProfessionalProfile {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly profileRepository: IProfessionalProfileRepository,
  ) {}

  async execute(
    dto: CreateProfessionalProfileInputDTO,
  ): Promise<DomainResult<CreateProfessionalProfileOutputDTO>> {
    const nameResult = PersonName.create(dto.displayName);
    if (nameResult.isLeft()) return left(nameResult.value);

    const idResult = UniqueEntityId.create(dto.userId);
    if (idResult.isLeft()) return left(idResult.value);

    const user = await this.userRepository.findById(idResult.value);
    if (!user) {
      return left(new UserNotFoundError(dto.userId));
    }

    const existingProfile = await this.profileRepository.findByUserId(dto.userId);
    if (existingProfile) {
      return left(new UserAlreadyHasProfileError(dto.userId));
    }

    const profileResult = ProfessionalProfile.create({
      userId: dto.userId,
      displayName: nameResult.value,
    });
    /* v8 ignore next */
    if (profileResult.isLeft()) return left(profileResult.value);

    const profile = profileResult.value;
    await this.profileRepository.save(profile);

    return right({
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName.value,
      status: profile.status,
      riskStatus: profile.riskStatus,
      createdAtUtc: profile.createdAtUtc.toISO(),
    });
  }
}
