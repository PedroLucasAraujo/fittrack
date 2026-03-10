import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChallengeNotFoundError, ChallengeNotEndedError } from '../../domain/errors/index.js';
import { ChallengeEndedEvent } from '../../domain/events/challenge-ended-event.js';
import { ChallengeCompletedEvent } from '../../domain/events/challenge-completed-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type {
  CompleteChallengeInputDTO,
  CompleteChallengeOutputDTO,
} from '../dtos/complete-challenge-dto.js';

export class CompleteChallengeUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(dto: CompleteChallengeInputDTO): Promise<DomainResult<CompleteChallengeOutputDTO>> {
    // 1. Find challenge
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (!challenge) {
      return left(new ChallengeNotFoundError());
    }

    // 2. Check hasEnded
    if (!challenge.hasEnded()) {
      return left(new ChallengeNotEndedError());
    }

    // 3. Transition to ended state
    const endResult = challenge.end();
    if (endResult.isLeft()) return left(endResult.value);

    // 4. Save
    await this.challengeRepo.save(challenge);

    // 5. Get all participations
    const participations = await this.participationRepo.findByChallenge(dto.challengeId);
    const totalParticipants = participations.length;
    const totalCompleted = participations.filter((p) => p.hasCompleted()).length;

    // 6. Sort by progress DESC for ranking
    const sorted = [...participations].sort((a, b) => {
      if (b.currentProgress !== a.currentProgress) {
        return b.currentProgress - a.currentProgress;
      }
      // Completers rank higher, and earlier completers rank higher
      if (a.completedAtUtc && b.completedAtUtc) {
        return a.completedAtUtc.getTime() - b.completedAtUtc.getTime();
      }
      if (a.completedAtUtc) return -1;
      if (b.completedAtUtc) return 1;
      return 0;
    });

    // 7. Determine winners based on rewardPolicy
    let winnerParticipations: typeof sorted;
    switch (challenge.rewardPolicy) {
      case 'WINNER':
        winnerParticipations = sorted.slice(0, 1);
        break;
      case 'TOP_3':
        winnerParticipations = sorted.slice(0, 3);
        break;
      case 'TOP_10':
        winnerParticipations = sorted.slice(0, 10);
        break;
      case 'ALL_COMPLETERS':
        winnerParticipations = sorted.filter((p) => p.hasCompleted());
        break;
      default:
        winnerParticipations = sorted.slice(0, 1);
    }

    const winners = winnerParticipations.map((p, index) => ({
      userId: p.userId,
      rank: index + 1,
      progress: p.currentProgress,
    }));

    const topRanks = sorted.slice(0, Math.min(3, sorted.length)).map((p, index) => ({
      userId: p.userId,
      rank: index + 1,
      progress: p.currentProgress,
    }));

    // 8. Publish events
    const endedAt = challenge.endedAtUtc ?? new Date();
    await this.publisher.publishChallengeEnded(
      new ChallengeEndedEvent(challenge.id, challenge.createdBy, {
        endedAtUtc: endedAt.toISOString(),
        name: challenge.name,
      }),
    );

    await this.publisher.publishChallengeCompleted(
      new ChallengeCompletedEvent(challenge.id, challenge.createdBy, {
        totalParticipants,
        totalCompleted,
        topRanks,
      }),
    );

    return right({ winners });
  }
}
