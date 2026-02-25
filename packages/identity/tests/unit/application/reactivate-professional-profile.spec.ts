import { describe, it, expect, beforeEach } from 'vitest';
import { ReactivateProfessionalProfile } from '../../../application/use-cases/reactivate-professional-profile.js';
import { InMemoryProfessionalProfileRepository } from '../../repositories/in-memory-professional-profile-repository.js';
import { InMemoryIdentityEventPublisherStub } from '../../stubs/in-memory-identity-event-publisher-stub.js';
import { makeProfessionalProfile } from '../../factories/make-professional-profile.js';
import { ProfessionalProfileStatus } from '../../../domain/enums/professional-profile-status.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('ReactivateProfessionalProfile', () => {
  let profileRepository: InMemoryProfessionalProfileRepository;
  let eventPublisher: InMemoryIdentityEventPublisherStub;
  let sut: ReactivateProfessionalProfile;

  beforeEach(() => {
    profileRepository = new InMemoryProfessionalProfileRepository();
    eventPublisher = new InMemoryIdentityEventPublisherStub();
    sut = new ReactivateProfessionalProfile(profileRepository, eventPublisher);
  });

  it('reactivates a suspended profile and returns output DTO', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.SUSPENDED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.profileId).toBe(profile.id);
      expect(output.status).toBe(ProfessionalProfileStatus.ACTIVE);
    }
  });

  it('publishes ProfessionalProfileReactivated event on success', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.SUSPENDED,
    });
    profileRepository.items.push(profile);

    await sut.execute({ professionalProfileId: profile.id });

    expect(eventPublisher.publishedReactivated).toHaveLength(1);
    expect(eventPublisher.publishedReactivated[0]!.aggregateId).toBe(profile.id);
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

  it('returns error if profile is not SUSPENDED', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.ACTIVE,
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

  it('returns error if profile is PENDING_APPROVAL', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.PENDING_APPROVAL,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('does not publish event when transition fails', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.ACTIVE,
    });
    profileRepository.items.push(profile);

    await sut.execute({ professionalProfileId: profile.id });

    expect(eventPublisher.publishedReactivated).toHaveLength(0);
  });
});
