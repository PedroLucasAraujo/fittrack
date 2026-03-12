import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { CompleteChallengeUseCase } from '../../../../application/use-cases/complete-challenge-use-case.js';
import type { CompleteChallengeOutputDTO } from '../../../../application/dtos/complete-challenge-dto.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengeParticipationRepository } from '../../../repositories/in-memory-challenge-participation-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';
import { makeChallenge } from '../../../helpers/make-challenge.js';
import { makeChallengeParticipation } from '../../../helpers/make-challenge-participation.js';

describe('CompleteChallengeUseCase', () => {
  let challengeRepo: InMemoryChallengeRepository;
  let participationRepo: InMemoryChallengeParticipationRepository;
  let publisher: InMemoryChallengesEventPublisher;
  let useCase: CompleteChallengeUseCase;

  beforeEach(() => {
    challengeRepo = new InMemoryChallengeRepository();
    participationRepo = new InMemoryChallengeParticipationRepository();
    publisher = new InMemoryChallengesEventPublisher();
    useCase = new CompleteChallengeUseCase(challengeRepo, participationRepo, publisher);
  });

  function makeEndedChallenge(overrides: Parameters<typeof makeChallenge>[0] = {}) {
    return makeChallenge({
      startedAtUtc: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      endDateUtc: new Date(Date.now() - 1000), // past
      endedAtUtc: null,
      canceledAtUtc: null,
      rewardPolicy: 'WINNER',
      goalTargetValue: 10,
      ...overrides,
    });
  }

  it('transitions challenge to ENDED state and saves it', async () => {
    const challenge = makeEndedChallenge();
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    const saved = await challengeRepo.findById(challenge.id);
    expect(saved!.endedAtUtc).not.toBeNull();
  });

  it('publishes ChallengeEndedEvent on success', async () => {
    const challenge = makeEndedChallenge();
    challengeRepo.items.push(challenge);

    await useCase.execute({ challengeId: challenge.id });

    expect(publisher.endedEvents).toHaveLength(1);
    const event = publisher.endedEvents[0]!;
    expect(event.aggregateId).toBe(challenge.id);
    expect(event.payload.endedAtUtc).toBeDefined();
    expect(event.payload.name).toBe(challenge.name);
  });

  it('publishes ChallengeCompletedEvent on success', async () => {
    const challenge = makeEndedChallenge();
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 10,
        completedAtUtc: new Date(),
      }),
    );

    await useCase.execute({ challengeId: challenge.id });

    expect(publisher.challengeCompletedEvents).toHaveLength(1);
    const event = publisher.challengeCompletedEvents[0]!;
    expect(event.payload.totalParticipants).toBe(1);
    expect(event.payload.totalCompleted).toBe(1);
  });

  it('determines winners correctly for WINNER policy (top 1)', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'WINNER' });
    const user1 = generateId();
    const user2 = generateId();
    const user3 = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId: user1, currentProgress: 8 }),
      makeChallengeParticipation({ challengeId: challenge.id, userId: user2, currentProgress: 10 }),
      makeChallengeParticipation({ challengeId: challenge.id, userId: user3, currentProgress: 6 }),
    );

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    expect((result.value as CompleteChallengeOutputDTO).winners).toHaveLength(1);
    expect((result.value as CompleteChallengeOutputDTO).winners[0]!.userId).toBe(user2); // highest progress
    expect((result.value as CompleteChallengeOutputDTO).winners[0]!.rank).toBe(1);
  });

  it('determines winners correctly for TOP_3 policy', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'TOP_3' });
    const users = [generateId(), generateId(), generateId(), generateId(), generateId()];
    const progresses = [10, 8, 6, 4, 2];
    challengeRepo.items.push(challenge);
    users.forEach((userId, i) => {
      participationRepo.items.push(
        makeChallengeParticipation({
          challengeId: challenge.id,
          userId,
          currentProgress: progresses[i]!,
        }),
      );
    });

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    expect((result.value as CompleteChallengeOutputDTO).winners).toHaveLength(3);
    expect((result.value as CompleteChallengeOutputDTO).winners[0]!.rank).toBe(1);
    expect((result.value as CompleteChallengeOutputDTO).winners[1]!.rank).toBe(2);
    expect((result.value as CompleteChallengeOutputDTO).winners[2]!.rank).toBe(3);
  });

  it('determines winners correctly for TOP_10 policy', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'TOP_10' });
    challengeRepo.items.push(challenge);
    for (let i = 15; i >= 1; i--) {
      participationRepo.items.push(
        makeChallengeParticipation({
          challengeId: challenge.id,
          userId: generateId(),
          currentProgress: i,
        }),
      );
    }

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    expect((result.value as CompleteChallengeOutputDTO).winners).toHaveLength(10);
    expect((result.value as CompleteChallengeOutputDTO).winners[0]!.progress).toBe(15);
    expect((result.value as CompleteChallengeOutputDTO).winners[9]!.progress).toBe(6);
  });

  it('determines winners correctly for ALL_COMPLETERS policy', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'ALL_COMPLETERS' });
    const completer1 = generateId();
    const completer2 = generateId();
    const nonCompleter = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId: completer1,
        currentProgress: 10,
        completedAtUtc: new Date(Date.now() - 2000),
      }),
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId: completer2,
        currentProgress: 10,
        completedAtUtc: new Date(Date.now() - 1000),
      }),
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId: nonCompleter,
        currentProgress: 5,
        completedAtUtc: null,
      }),
    );

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    expect((result.value as CompleteChallengeOutputDTO).winners).toHaveLength(2);
    const winnerIds = (result.value as CompleteChallengeOutputDTO).winners.map((w) => w.userId);
    expect(winnerIds).toContain(completer1);
    expect(winnerIds).toContain(completer2);
    expect(winnerIds).not.toContain(nonCompleter);
  });

  it('returns empty winners array when no participants', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'WINNER' });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    expect((result.value as CompleteChallengeOutputDTO).winners).toHaveLength(0);
    expect(publisher.challengeCompletedEvents[0]!.payload.totalParticipants).toBe(0);
    expect(publisher.challengeCompletedEvents[0]!.payload.totalCompleted).toBe(0);
  });

  it('fails with ChallengeNotFoundError when challenge does not exist', async () => {
    const result = await useCase.execute({ challengeId: generateId() });
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('found');
  });

  it('fails with ChallengeNotEndedError when challenge endDate is still in the future', async () => {
    const challenge = makeChallenge({
      startedAtUtc: new Date(),
      endDateUtc: new Date(Date.now() + 100_000), // future
      endedAtUtc: null,
    });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({ challengeId: challenge.id });
    expect(result.isLeft()).toBe(true);
    expect((result.value as { message: string }).message).toContain('ended');
  });

  it('fails with ChallengeAlreadyEndedError when challenge was already ended', async () => {
    const pastDate = new Date(Date.now() - 1000);
    const challenge = makeChallenge({
      endDateUtc: pastDate,
      endedAtUtc: pastDate, // already ended
      canceledAtUtc: null,
    });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({ challengeId: challenge.id });
    expect(result.isLeft()).toBe(true);
  });

  it('ChallengeCompletedEvent payload includes correct topRanks (up to 3)', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'TOP_10' });
    const user1 = generateId();
    const user2 = generateId();
    const user3 = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId: user1, currentProgress: 10 }),
      makeChallengeParticipation({ challengeId: challenge.id, userId: user2, currentProgress: 7 }),
      makeChallengeParticipation({ challengeId: challenge.id, userId: user3, currentProgress: 5 }),
    );

    await useCase.execute({ challengeId: challenge.id });

    const completedEvent = publisher.challengeCompletedEvents[0]!;
    expect(completedEvent.payload.topRanks).toHaveLength(3);
    expect(completedEvent.payload.topRanks[0]!.userId).toBe(user1);
    expect(completedEvent.payload.topRanks[0]!.rank).toBe(1);
    expect(completedEvent.payload.topRanks[1]!.rank).toBe(2);
    expect(completedEvent.payload.topRanks[2]!.rank).toBe(3);
  });

  it('sorts participants by completedAtUtc ASC when progress is tied', async () => {
    const challenge = makeEndedChallenge({ rewardPolicy: 'WINNER' });
    const earlyUser = generateId();
    const lateUser = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId: lateUser,
        currentProgress: 10,
        completedAtUtc: new Date(Date.now() - 500), // completed later
      }),
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId: earlyUser,
        currentProgress: 10,
        completedAtUtc: new Date(Date.now() - 1000), // completed earlier
      }),
    );

    const result = await useCase.execute({ challengeId: challenge.id });

    expect(result.isRight()).toBe(true);
    expect((result.value as CompleteChallengeOutputDTO).winners[0]!.userId).toBe(earlyUser); // earlier completer wins tie
  });
});
