import { describe, it, expect, beforeEach } from 'vitest';
import { DeactivateProfessionalProfile } from '../../../application/use-cases/deactivate-professional-profile.js';
import { InMemoryProfessionalProfileRepository } from '../../repositories/in-memory-professional-profile-repository.js';
import { InMemoryIdentityEventPublisherStub } from '../../stubs/in-memory-identity-event-publisher-stub.js';
import { makeProfessionalProfile } from '../../factories/make-professional-profile.js';
import { ProfessionalProfileStatus } from '../../../domain/enums/professional-profile-status.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('DeactivateProfessionalProfile', () => {
  let profileRepository: InMemoryProfessionalProfileRepository;
  let eventPublisher: InMemoryIdentityEventPublisherStub;
  let sut: DeactivateProfessionalProfile;

  beforeEach(() => {
    profileRepository = new InMemoryProfessionalProfileRepository();
    eventPublisher = new InMemoryIdentityEventPublisherStub();
    sut = new DeactivateProfessionalProfile(profileRepository, eventPublisher);
  });

  it('deactivates an active profile and returns output DTO', async () => {
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

  it('publishes ProfessionalProfileDeactivated event on success', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.ACTIVE,
    });
    profileRepository.items.push(profile);

    await sut.execute({ professionalProfileId: profile.id });

    expect(eventPublisher.publishedDeactivated).toHaveLength(1);
    expect(eventPublisher.publishedDeactivated[0]!.aggregateId).toBe(profile.id);
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

  it('does not publish event when transition fails', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.BANNED,
    });
    profileRepository.items.push(profile);

    await sut.execute({ professionalProfileId: profile.id });

    expect(eventPublisher.publishedDeactivated).toHaveLength(0);
  });
});
