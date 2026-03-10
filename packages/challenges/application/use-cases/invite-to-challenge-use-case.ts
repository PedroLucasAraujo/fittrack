import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import {
  ChallengeNotFoundError,
  ChallengeDoesNotRequireInviteError,
  AlreadyJoinedChallengeError,
} from '../../domain/errors/index.js';
import { ChallengeInviteSentEvent } from '../../domain/events/challenge-invite-sent-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengeParticipationRepository } from '../../domain/repositories/i-challenge-participation-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type {
  InviteToChallengeInputDTO,
  InviteToChallengeOutputDTO,
} from '../dtos/invite-to-challenge-dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InviteToChallengeUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly participationRepo: IChallengeParticipationRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(dto: InviteToChallengeInputDTO): Promise<DomainResult<InviteToChallengeOutputDTO>> {
    // 1. Validate UUIDs
    if (
      !UUID_REGEX.test(dto.challengeId) ||
      !UUID_REGEX.test(dto.invitedBy) ||
      !UUID_REGEX.test(dto.invitedUserId)
    ) {
      return left(new ChallengeNotFoundError());
    }

    // 2. Find challenge
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (!challenge) {
      return left(new ChallengeNotFoundError());
    }

    // Only PRIVATE challenges or HEAD_TO_HEAD challenges require an explicit invite.
    if (!challenge.requiresInvite() && !challenge.isHeadToHead()) {
      return left(new ChallengeDoesNotRequireInviteError());
    }

    // 4. Check if already joined
    const existing = await this.participationRepo.findByChallengeAndUser(
      dto.challengeId,
      dto.invitedUserId,
    );
    if (existing) {
      return left(new AlreadyJoinedChallengeError());
    }

    // 5. Publish invite sent event
    const sentAt = new Date();
    await this.publisher.publishInviteSent(
      new ChallengeInviteSentEvent(dto.challengeId, dto.invitedBy, {
        challengeId: dto.challengeId,
        invitedBy: dto.invitedBy,
        invitedUserId: dto.invitedUserId,
        sentAtUtc: sentAt.toISOString(),
      }),
    );

    return right({ inviteSentAt: sentAt });
  }
}
