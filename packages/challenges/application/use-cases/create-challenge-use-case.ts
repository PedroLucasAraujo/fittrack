import { UTCDateTime, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Challenge } from '../../domain/aggregates/challenge.js';
import { InvalidCreatorIdError } from '../../domain/errors/index.js';
import { ChallengeCreatedEvent } from '../../domain/events/challenge-created-event.js';
import { ChallengeStartedEvent } from '../../domain/events/challenge-started-event.js';
import type { IChallengeRepository } from '../../domain/repositories/i-challenge-repository.js';
import type { IChallengesEventPublisher } from '../ports/i-challenges-event-publisher.js';
import type {
  CreateChallengeInputDTO,
  CreateChallengeOutputDTO,
} from '../dtos/create-challenge-dto.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CreateChallengeUseCase {
  constructor(
    private readonly repo: IChallengeRepository,
    private readonly publisher: IChallengesEventPublisher,
  ) {}

  async execute(dto: CreateChallengeInputDTO): Promise<DomainResult<CreateChallengeOutputDTO>> {
    // createdBy must be a valid UUID — application-layer concern, not enforced by the domain.
    if (!UUID_REGEX.test(dto.createdBy)) {
      return left(new InvalidCreatorIdError());
    }

    const now = UTCDateTime.now();

    // Challenge.create() validates all domain invariants (type, visibility, category,
    // metric type, goal target, reward policy, name, description, date ordering) via
    // Value Objects and enforces maxParticipants based on challenge type.
    const createResult = Challenge.create({
      createdBy: dto.createdBy,
      type: dto.type,
      visibility: dto.visibility,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      goalMetricType: dto.goalMetricType,
      goalTargetValue: dto.goalTargetValue,
      startDateUtc: dto.startDateUtc,
      endDateUtc: dto.endDateUtc,
      maxParticipants: dto.maxParticipants ?? null,
      rewardPolicy: dto.rewardPolicy,
      createdAtUtc: now,
      updatedAtUtc: now,
    });
    if (createResult.isLeft()) return left(createResult.value);
    const challenge = createResult.value;

    // Auto-start before the first save to avoid two saves in the same transaction.
    // A challenge whose startDate is now or in the past goes directly to ACTIVE state.
    // ADR-0047 §4 — both events are published after save() confirms persistence.
    if (dto.startDateUtc <= new Date()) {
      challenge.start(); // always succeeds on a freshly created challenge
    }

    await this.repo.save(challenge);

    await this.publisher.publishChallengeCreated(
      new ChallengeCreatedEvent(challenge.id, dto.createdBy, {
        createdBy: dto.createdBy,
        type: challenge.type,
        visibility: challenge.visibility,
        name: challenge.name,
        category: challenge.category,
        startDateUtc: dto.startDateUtc.toISOString(),
        endDateUtc: dto.endDateUtc.toISOString(),
        goalMetricType: challenge.goalMetricType,
        goalTargetValue: challenge.goalTargetValue,
        maxParticipants: challenge.maxParticipants,
        rewardPolicy: challenge.rewardPolicy,
      }),
    );

    if (challenge.startedAtUtc !== null) {
      await this.publisher.publishChallengeStarted(
        new ChallengeStartedEvent(challenge.id, dto.createdBy, {
          startedAtUtc: challenge.startedAtUtc.toISOString(),
          type: challenge.type,
          name: challenge.name,
        }),
      );
    }

    return right({ challengeId: challenge.id });
  }
}
