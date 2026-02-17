import { describe, it, expect, beforeEach } from 'vitest';
import { BanProfessionalProfile } from '../../../application/use-cases/ban-professional-profile.js';
import { InMemoryProfessionalProfileRepository } from '../../repositories/in-memory-professional-profile-repository.js';
import { makeProfessionalProfile } from '../../factories/make-professional-profile.js';
import { ProfessionalProfileStatus } from '../../../domain/enums/professional-profile-status.js';
import { RiskStatus } from '../../../domain/enums/risk-status.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('BanProfessionalProfile', () => {
  let profileRepository: InMemoryProfessionalProfileRepository;
  let sut: BanProfessionalProfile;

  beforeEach(() => {
    profileRepository = new InMemoryProfessionalProfileRepository();
    sut = new BanProfessionalProfile(profileRepository);
  });

  it('bans an active profile and returns output DTO', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.ACTIVE,
      riskStatus: RiskStatus.NORMAL,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
      reason: 'Confirmed fraud',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.profileId).toBe(profile.id);
      expect(output.status).toBe(ProfessionalProfileStatus.BANNED);
      expect(output.riskStatus).toBe(RiskStatus.BANNED);
      expect(output.bannedAtUtc).toBeDefined();
    }
  });

  it('bans a suspended profile successfully', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.SUSPENDED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
      reason: 'Escalation from watchlist',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.status).toBe(ProfessionalProfileStatus.BANNED);
    }
  });

  it('returns error if profile not found', async () => {
    const result = await sut.execute({
      professionalProfileId: 'a0000000-0000-4000-8000-000000000000',
      reason: 'No such profile',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.PROFESSIONAL_PROFILE_NOT_FOUND);
    }
  });

  it('returns error if profileId is not a valid UUID', async () => {
    const result = await sut.execute({
      professionalProfileId: 'not-a-uuid',
      reason: 'Invalid id',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns error if profile is already banned', async () => {
    const profile = makeProfessionalProfile({
      status: ProfessionalProfileStatus.BANNED,
      riskStatus: RiskStatus.BANNED,
    });
    profileRepository.items.push(profile);

    const result = await sut.execute({
      professionalProfileId: profile.id,
      reason: 'Double ban',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PROFILE_TRANSITION);
    }
  });
});
