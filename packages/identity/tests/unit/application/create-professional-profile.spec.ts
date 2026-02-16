import { describe, it, expect, beforeEach } from 'vitest';
import { CreateProfessionalProfile } from '../../../application/use-cases/create-professional-profile.js';
import { InMemoryUserRepository } from '../../repositories/in-memory-user-repository.js';
import { InMemoryProfessionalProfileRepository } from '../../repositories/in-memory-professional-profile-repository.js';
import { makeUser } from '../../factories/make-user.js';
import { makeProfessionalProfile } from '../../factories/make-professional-profile.js';
import { UserRole } from '../../../domain/enums/user-role.js';
import { ProfessionalProfileStatus } from '../../../domain/enums/professional-profile-status.js';
import { RiskStatus } from '../../../domain/enums/risk-status.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('CreateProfessionalProfile', () => {
  let userRepository: InMemoryUserRepository;
  let profileRepository: InMemoryProfessionalProfileRepository;
  let sut: CreateProfessionalProfile;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    profileRepository = new InMemoryProfessionalProfileRepository();
    sut = new CreateProfessionalProfile(userRepository, profileRepository);
  });

  it('creates a professional profile and returns output DTO', async () => {
    const user = makeUser({ role: UserRole.PROFESSIONAL });
    userRepository.items.push(user);

    const result = await sut.execute({
      userId: user.id,
      displayName: 'Dr. Smith',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.id).toBeDefined();
      expect(output.userId).toBe(user.id);
      expect(output.displayName).toBe('Dr. Smith');
      expect(output.status).toBe(ProfessionalProfileStatus.PENDING_APPROVAL);
      expect(output.riskStatus).toBe(RiskStatus.NORMAL);
      expect(output.createdAtUtc).toBeDefined();
    }
    expect(profileRepository.items).toHaveLength(1);
  });

  it('returns error if user not found', async () => {
    const result = await sut.execute({
      userId: 'a0000000-0000-4000-8000-000000000000',
      displayName: 'Dr. Smith',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.USER_NOT_FOUND);
    }
  });

  it('returns error if userId is not a valid UUID', async () => {
    const result = await sut.execute({
      userId: 'not-a-uuid',
      displayName: 'Dr. Smith',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if user already has a profile', async () => {
    const user = makeUser({ role: UserRole.PROFESSIONAL });
    userRepository.items.push(user);

    const existingProfile = makeProfessionalProfile({ userId: user.id });
    profileRepository.items.push(existingProfile);

    const result = await sut.execute({
      userId: user.id,
      displayName: 'Another Profile',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.USER_ALREADY_HAS_PROFILE);
    }
  });

  it('returns error for invalid display name', async () => {
    const user = makeUser({ role: UserRole.PROFESSIONAL });
    userRepository.items.push(user);

    const result = await sut.execute({
      userId: user.id,
      displayName: '',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PERSON_NAME);
    }
  });
});
