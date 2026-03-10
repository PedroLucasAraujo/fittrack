import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChallengeInviteAcceptedEvent } from '../../domain/events/challenge-invite-accepted-event.js';
import { ChallengeStartedEvent } from '../../domain/events/challenge-started-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type {
  AcceptChallengeInviteInputDTO,
  AcceptChallengeInviteOutputDTO,
} from '../dtos/accept-challenge-invite-dto.js';
import { JoinChallengeUseCase } from './join-challenge-use-case.js';

export class AcceptChallengeInviteUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(
    dto: AcceptChallengeInviteInputDTO,
  ): Promise<DomainResult<AcceptChallengeInviteOutputDTO>> {
    const joinUseCase = new JoinChallengeUseCase(
      this.challengeRepo,
      this.participationRepo,
      this.publisher,
    );
    const joinResult = await joinUseCase.execute({
      challengeId: dto.challengeId,
      userId: dto.userId,
    });
    if (joinResult.isLeft()) return left(joinResult.value);

    const { participationId } = joinResult.value;
    const acceptedAt = new Date();

    // ADR-0047 §4 — publish after join is persisted (JoinChallengeUseCase saves internally)
    await this.publisher.publishInviteAccepted(
      new ChallengeInviteAcceptedEvent(dto.challengeId, dto.userId, {
        challengeId: dto.challengeId,
        userId: dto.userId,
        acceptedAtUtc: acceptedAt.toISOString(),
      }),
    );

    // HEAD_TO_HEAD auto-start: the challenge begins the moment exactly 2 participants
    // have joined. We reload the challenge here to get the post-join participant count.
    //
    // Known limitation: concurrent accepts can bypass this check simultaneously.
    // The infrastructure repository MUST enforce optimistic locking via the `version`
    // field on the Challenge aggregate to guarantee exactly-once start. If two concurrent
    // saves arrive, only the first (version N→N+1) succeeds; the second fails with a
    // version conflict and must be retried.
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (challenge && challenge.isHeadToHead() && challenge.isDraft()) {
      const count = await this.participationRepo.countByChallenge(dto.challengeId);
      if (count >= 2) {
        const startResult = challenge.start();
        if (startResult.isRight()) {
          await this.challengeRepo.save(challenge);
          const startedAt = challenge.startedAtUtc ?? new Date();
          await this.publisher.publishChallengeStarted(
            new ChallengeStartedEvent(challenge.id, challenge.createdBy, {
              startedAtUtc: startedAt.toISOString(),
              type: challenge.type,
              name: challenge.name,
            }),
          );
        }
      }
    }

    return right({ participationId });
  }
}
