import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChallengeNotFoundError, NotParticipantError } from '../../domain/errors/index.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type {
  GetUserChallengeProgressInputDTO,
  GetUserChallengeProgressOutputDTO,
} from '../dtos/get-user-challenge-progress-dto.js';

export class GetUserChallengeProgressUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
  ) {}

  async execute(
    dto: GetUserChallengeProgressInputDTO,
  ): Promise<DomainResult<GetUserChallengeProgressOutputDTO>> {
    // 1. Find participation
    const participation = await this.participationRepo.findByChallengeAndUser(
      dto.challengeId,
      dto.userId,
    );
    if (!participation) {
      return left(new NotParticipantError());
    }

    // 2. Find challenge for goalTargetValue
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (!challenge) {
      return left(new ChallengeNotFoundError());
    }

    // 3. Map to output DTO
    return right({
      participationId: participation.id,
      challengeId: participation.challengeId,
      userId: participation.userId,
      currentProgress: participation.currentProgress,
      progressPercentage: participation.progressPercentage,
      goalTargetValue: challenge.goalTargetValue,
      hasCompleted: participation.hasCompleted(),
      completedAtUtc: participation.completedAtUtc,
      joinedAtUtc: participation.joinedAtUtc,
    });
  }
}
