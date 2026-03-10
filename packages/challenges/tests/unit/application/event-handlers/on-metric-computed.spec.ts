import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { OnMetricComputed } from '../../../../application/event-handlers/on-metric-computed.js';
import { UpdateChallengeProgressUseCase } from '../../../../application/use-cases/update-challenge-progress-use-case.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengeParticipationRepository } from '../../../repositories/in-memory-challenge-participation-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';
import { makeChallenge } from '../../../helpers/make-challenge.js';
import { makeChallengeParticipation } from '../../../helpers/make-challenge-participation.js';

describe('OnMetricComputed', () => {
  let challengeRepo: InMemoryChallengeRepository;
  let participationRepo: InMemoryChallengeParticipationRepository;
  let publisher: InMemoryChallengesEventPublisher;
  let updateProgressUseCase: UpdateChallengeProgressUseCase;
  let handler: OnMetricComputed;

  beforeEach(() => {
    challengeRepo = new InMemoryChallengeRepository();
    participationRepo = new InMemoryChallengeParticipationRepository();
    publisher = new InMemoryChallengesEventPublisher();
    updateProgressUseCase = new UpdateChallengeProgressUseCase(
      challengeRepo,
      participationRepo,
      publisher,
    );
    handler = new OnMetricComputed(updateProgressUseCase);
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

  it('updates progress for a matching active challenge with an active participation', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 5 });

    const p = await participationRepo.findByChallengeAndUser(challenge.id, userId);
    expect(p!.currentProgress).toBe(5);
    expect(publisher.progressUpdatedEvents).toHaveLength(1);
  });

  it('skips challenges whose goalMetricType does not match the event metricType', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge({ goalMetricType: 'TOTAL_VOLUME' }); // different
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({ challengeId: challenge.id, userId, currentProgress: 0 }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 5 });

    // No progress updated — metric type mismatch — use case returns silently
    expect(publisher.progressUpdatedEvents).toHaveLength(0);
  });

  it('skips challenges the user does not participate in', async () => {
    const userId = generateId();
    const otherUserId = generateId();
    const challenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    challengeRepo.items.push(challenge);
    // Only other user participates
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId: otherUserId,
        currentProgress: 0,
      }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 5 });

    expect(publisher.progressUpdatedEvents).toHaveLength(0);
    // other user untouched
    const p = await participationRepo.findByChallengeAndUser(challenge.id, otherUserId);
    expect(p!.currentProgress).toBe(0);
  });

  it('skips participations that have already been completed', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 10,
        completedAtUtc: new Date(), // already completed
      }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 12 });

    // Handler skips completed participations before calling useCase
    expect(publisher.progressUpdatedEvents).toHaveLength(0);
  });

  it('processes multiple active challenges for the same user and metric type', async () => {
    const userId = generateId();
    const challenge1 = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    const challenge2 = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    challengeRepo.items.push(challenge1, challenge2);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge1.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
      makeChallengeParticipation({
        challengeId: challenge2.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 3 });

    const p1 = await participationRepo.findByChallengeAndUser(challenge1.id, userId);
    const p2 = await participationRepo.findByChallengeAndUser(challenge2.id, userId);
    expect(p1!.currentProgress).toBe(3);
    expect(p2!.currentProgress).toBe(3);
    expect(publisher.progressUpdatedEvents).toHaveLength(2);
  });

  it('handles no active challenges gracefully (no-op)', async () => {
    await handler.handle({ userId: generateId(), metricType: 'WORKOUT_COUNT', value: 5 });
    expect(publisher.progressUpdatedEvents).toHaveLength(0);
  });

  it('does not update non-matching challenges when one challenge matches', async () => {
    const userId = generateId();
    const matchingChallenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    const nonMatchingChallenge = makeActiveChallenge({ goalMetricType: 'STREAK_DAYS' });
    challengeRepo.items.push(matchingChallenge, nonMatchingChallenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: matchingChallenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
      makeChallengeParticipation({
        challengeId: nonMatchingChallenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 4 });

    const matchingP = await participationRepo.findByChallengeAndUser(matchingChallenge.id, userId);
    const nonMatchingP = await participationRepo.findByChallengeAndUser(
      nonMatchingChallenge.id,
      userId,
    );
    expect(matchingP!.currentProgress).toBe(4);
    expect(nonMatchingP!.currentProgress).toBe(0); // untouched
  });

  it('publishes ChallengeParticipantCompletedEvent when goal is reached via metric event', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT', goalTargetValue: 5 });
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 4,
        completedAtUtc: null,
      }),
    );

    await handler.handle({ userId, metricType: 'WORKOUT_COUNT', value: 5 });

    expect(publisher.participantCompletedEvents).toHaveLength(1);
    expect(publisher.participantCompletedEvents[0]!.payload.userId).toBe(userId);
  });
});
