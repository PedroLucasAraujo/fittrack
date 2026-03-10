import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { ChallengeNotFoundError, ChallengeNotAuthorizedError } from '../../domain/errors/index.js';
import { ChallengeCanceledEvent } from '../../domain/events/challenge-canceled-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type {
  CancelChallengeInputDTO,
  CancelChallengeOutputDTO,
} from '../dtos/cancel-challenge-dto.js';

export class CancelChallengeUseCase {
  constructor(
    private readonly challengeRepo: IChallengeRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(dto: CancelChallengeInputDTO): Promise<DomainResult<CancelChallengeOutputDTO>> {
    const challenge = await this.challengeRepo.findById(dto.challengeId);
    if (!challenge) {
      return left(new ChallengeNotFoundError());
    }

    // Only the challenge creator is authorized to cancel.
    // Cancellation by a system actor (e.g. admin) is intentionally not supported
    // in MVP — all cancellations must originate from the creator.
    if (dto.canceledBy !== challenge.createdBy) {
      return left(new ChallengeNotAuthorizedError());
    }

    const cancelResult = challenge.cancel(dto.reason);
    if (cancelResult.isLeft()) return left(cancelResult.value);

    // ADR-0047 §4 — event is published after repository.save() confirms persistence
    await this.challengeRepo.save(challenge);

    const canceledAt = challenge.canceledAtUtc ?? new Date();
    await this.publisher.publishChallengeCanceled(
      new ChallengeCanceledEvent(challenge.id, dto.canceledBy, {
        canceledAtUtc: canceledAt.toISOString(),
        reason: dto.reason,
        name: challenge.name,
      }),
    );

    return right({ canceledAt });
  }
}
