import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChallengeParticipation } from '../../domain/aggregates/challenge-participation.js';
import {
  ChallengeNotFoundError,
  ChallengeNotJoinableError,
  AlreadyJoinedChallengeError,
  ChallengeFullError,
} from '../../domain/errors/index.js';
import { ChallengeParticipationCreatedEvent } from '../../domain/events/challenge-participation-created-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type { JoinChallengeInputDTO, JoinChallengeOutputDTO } from '../dtos/join-challenge-dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class JoinChallengeUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(dto: JoinChallengeInputDTO): Promise<DomainResult<JoinChallengeOutputDTO>> {
    // 1. Validate UUIDs
    if (!UUID_REGEX.test(dto.challengeId) || !UUID_REGEX.test(dto.userId)) {
      return left(new ChallengeNotFoundError());
    }

    // 2. Find challenge
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (!challenge) {
      return left(new ChallengeNotFoundError());
    }

    // 3. Check canJoin
    if (!challenge.canJoin()) {
      return left(new ChallengeNotJoinableError());
    }

    // 4. Check already joined
    const existing = await this.participationRepo.findByChallengeAndUser(
      dto.challengeId,
      dto.userId,
    );
    if (existing) {
      return left(new AlreadyJoinedChallengeError());
    }

    // 5. Check capacity
    if (challenge.maxParticipants !== null) {
      const count = await this.participationRepo.countByChallenge(dto.challengeId);
      if (count >= challenge.maxParticipants) {
        return left(new ChallengeFullError());
      }
    }

    // 6. Create participation
    const now = UTCDateTime.now();
    const joinedAt = new Date();
    const createResult = ChallengeParticipation.create({
      challengeId: dto.challengeId,
      userId: dto.userId,
      joinedAtUtc: joinedAt,
      createdAtUtc: now,
      updatedAtUtc: now,
    });
    if (createResult.isLeft()) return left(createResult.value);
    const participation = createResult.value;

    // 7. Save
    await this.participationRepo.save(participation);

    // 8. Publish event
    await this.publisher.publishParticipationCreated(
      new ChallengeParticipationCreatedEvent(participation.id, dto.userId, {
        challengeId: dto.challengeId,
        userId: dto.userId,
        joinedAtUtc: joinedAt.toISOString(),
      }),
    );

    // 9. Return
    return right({ participationId: participation.id });
  }
}
