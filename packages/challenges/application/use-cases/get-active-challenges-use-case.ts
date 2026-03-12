import { right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type {
  GetActiveChallengesInputDTO,
  GetActiveChallengesOutputDTO,
  ChallengeSummaryDTO,
} from '../dtos/get-active-challenges-dto.js';

export class GetActiveChallengesUseCase {
  constructor(private readonly challengeRepo: IChallengeRepository) {}

  async execute(
    dto: GetActiveChallengesInputDTO,
  ): Promise<DomainResult<GetActiveChallengesOutputDTO>> {
    // Filters are pushed to the repository to avoid loading all active challenges
    // into memory and filtering there, which does not scale.
    const filters: { visibility?: string; type?: string } = {};
    if (dto.visibility !== undefined) filters.visibility = dto.visibility;
    if (dto.type !== undefined) filters.type = dto.type;
    const challenges = await this.challengeRepo.findActive(filters);

    const summaries: ChallengeSummaryDTO[] = challenges.map((c) => ({
      challengeId: c.id,
      name: c.name,
      description: c.description,
      type: c.type,
      visibility: c.visibility,
      category: c.category,
      goalMetricType: c.goalMetricType,
      goalTargetValue: c.goalTargetValue,
      startDateUtc: c.startDateUtc,
      endDateUtc: c.endDateUtc,
      rewardPolicy: c.rewardPolicy,
      maxParticipants: c.maxParticipants,
    }));

    return right({ challenges: summaries });
  }
}
