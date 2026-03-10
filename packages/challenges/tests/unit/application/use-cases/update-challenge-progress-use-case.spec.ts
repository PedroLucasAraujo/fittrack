import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { UpdateChallengeProgressUseCase } from '../../../../application/use-cases/update-challenge-progress-use-case.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengeParticipationRepository } from '../../../repositories/in-memory-challenge-participation-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';
import { makeChallenge } from '../../../helpers/make-challenge.js';
import { makeChallengeParticipation } from '../../../helpers/make-challenge-participation.js';

describe('UpdateChallengeProgressUseCase', () => {
  let challengeRepo: InMemoryChallengeRepository;
  let participationRepo: InMemoryChallengeParticipationRepository;
  let publisher: InMemoryChallengesEventPublisher;
  let useCase: UpdateChallengeProgressUseCase;

  beforeEach(() => {
    challengeRepo = new InMemoryChallengeRepository();
    participationRepo = new InMemoryChallengeParticipationRepository();
    publisher = new InMemoryChallengesEventPublisher();
    useCase = new UpdateChallengeProgressUseCase(challengeRepo, participationRepo, publisher);
  });

  function makeActiveChallenge(overrides: Parameters<typeof makeChallenge>[0] = {}) {
    return makeChallenge({
      startedAtUtc: new Date(),
      endedAtUtc: null,
      canceledAtUtc: null,
      endDateUtc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      goalMetricType: 'WORKOUT_COUNT',
      goalTargetValue: 10,
      ...overrides,
    });
  }

  it('updates progress and publishes ChallengeProgressUpdatedEvent', async () => {
    const challenge = makeActiveChallenge();
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId, currentProgress: 0 }),
    );

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.currentProgress).toBe(5);
    expect(result.value.progressPercentage).toBe(50);
    expect(result.value.completedGoal).toBe(false);
    expect(publisher.progressUpdatedEvents).toHaveLength(1);
  });

  it('includes previousProgress in ChallengeProgressUpdatedEvent payload', async () => {
    const challenge = makeActiveChallenge();
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId, currentProgress: 3 }),
    );

    await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 7,
    });

    const event = publisher.progressUpdatedEvents[0]!;
    expect(event.payload.previousProgress).toBe(3);
    expect(event.payload.currentProgress).toBe(7);
  });

  it('publishes ChallengeParticipantCompletedEvent when goal is reached', async () => {
    const challenge = makeActiveChallenge({ goalTargetValue: 10 });
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 9,
        completedAtUtc: null,
      }),
    );

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 10,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.completedGoal).toBe(true);
    expect(publisher.participantCompletedEvents).toHaveLength(1);
    const completedEvent = publisher.participantCompletedEvents[0]!;
    expect(completedEvent.payload.challengeId).toBe(challenge.id);
    expect(completedEvent.payload.userId).toBe(userId);
    expect(completedEvent.payload.finalProgress).toBe(10);
  });

  it('does NOT publish ChallengeParticipantCompletedEvent when goal is not reached', async () => {
    const challenge = makeActiveChallenge({ goalTargetValue: 10 });
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId, currentProgress: 0 }),
    );

    await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });

    expect(publisher.participantCompletedEvents).toHaveLength(0);
  });

  it('fails with ChallengeNotFoundError when challenge does not exist', async () => {
    const result = await useCase.execute({
      challengeId: generateId(),
      userId: generateId(),
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('found');
  });

  it('fails with ChallengeNotActiveError when challenge is not active (draft)', async () => {
    const challenge = makeChallenge({ startedAtUtc: null }); // DRAFT
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(),
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails with ChallengeNotActiveError when challenge endDate has passed', async () => {
    const challenge = makeChallenge({
      startedAtUtc: new Date(Date.now() - 2000),
      endDateUtc: new Date(Date.now() - 1000),
      endedAtUtc: null,
      canceledAtUtc: null,
    });
    challengeRepo.items.push(challenge);

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(),
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });
    expect(result.isLeft()).toBe(true);
  });

  it('fails with NotParticipantError when user is not participating', async () => {
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);
    // no participation added

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId: generateId(),
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('participant');
  });

  it('returns current values silently when metricType does not match challenge goalMetricType', async () => {
    const challenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT', goalTargetValue: 10 });
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 3,
        progressPercentage: 30,
      }),
    );

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'TOTAL_VOLUME', // different metric type
      newProgressValue: 500,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.currentProgress).toBe(3); // unchanged
    expect(result.value.progressPercentage).toBe(30); // unchanged (stored value)
    expect(publisher.progressUpdatedEvents).toHaveLength(0); // no event
  });

  it('propagates ProgressCannotDecreaseError when progress decreases', async () => {
    const challenge = makeActiveChallenge();
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId, currentProgress: 7 }),
    );

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 3, // decrease!
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value.message).toContain('decrease');
  });

  it('saves updated participation to repository on success', async () => {
    const challenge = makeActiveChallenge();
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId, currentProgress: 0 }),
    );

    await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 8,
    });

    const saved = await participationRepo.findByChallengeAndUser(challenge.id, userId);
    expect(saved!.currentProgress).toBe(8);
  });

  it('returns completedGoal: true and 100% progressPercentage when goal exactly reached', async () => {
    const challenge = makeActiveChallenge({ goalTargetValue: 5 });
    const userId = generateId();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );

    const result = await useCase.execute({
      challengeId: challenge.id,
      userId,
      metricType: 'WORKOUT_COUNT',
      newProgressValue: 5,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value.completedGoal).toBe(true);
    expect(result.value.progressPercentage).toBe(100);
  });
});
