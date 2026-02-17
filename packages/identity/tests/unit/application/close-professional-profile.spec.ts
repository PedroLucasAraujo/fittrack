import { describe, it, expect, beforeEach } from 'vitest';
import { CloseProfessionalProfile } from '../../../application/use-cases/close-professional-profile.js';
import { InMemoryProfessionalProfileRepository } from '../../repositories/in-memory-professional-profile-repository.js';
import { makeProfessionalProfile } from '../../factories/make-professional-profile.js';
import { ProfessionalProfileStatus } from '../../../domain/enums/professional-profile-status.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('CloseProfessionalProfile', () => {
  let profileRepository: InMemoryProfessionalProfileRepository;
  let sut: CloseProfessionalProfile;

  beforeEach(() => {
    profileRepository = new InMemoryProfessionalProfileRepository();
    sut = new CloseProfessionalProfile(profileRepository);
  });

  it('closes an active profile and returns output DTO', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.ACTIVE,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.profileId).toBe(profile.id);
      expect(output.status).toBe(ProfessionalProfileStatus.DEACTIVATED);
      expect(output.deactivatedAtUtc).toBeDefined();
    }
  });

  it('returns error if profile not found', async () => {
    const result = await sut.execute({
      professionalProfileId: 'a0000000-0000-4000-8000-000000000000',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.PROFESSIONAL_PROFILE_NOT_FOUND);
    }
  });

  it('returns error if profileId is not a valid UUID', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if profile is not in ACTIVE state', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.SUSPENDED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PROFILE_TRANSITION);
    }
  });

  it('returns error if profile is already deactivated', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.DEACTIVATED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if profile is banned', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.BANNED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if profile is already closed', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.CLOSED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isLeft()).toBe(true);
  });
});
