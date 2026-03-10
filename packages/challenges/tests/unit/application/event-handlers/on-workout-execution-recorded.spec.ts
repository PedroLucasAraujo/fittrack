import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { OnWorkoutExecutionRecorded } from '../../../../application/event-handlers/on-workout-execution-recorded.js';
import { UpdateChallengeProgressUseCase } from '../../../../application/use-cases/update-challenge-progress-use-case.js';
import { InMemoryChallengeRepository } from '../../../repositories/in-memory-challenge-repository.js';
import { InMemoryChallengeParticipationRepository } from '../../../repositories/in-memory-challenge-participation-repository.js';
import { InMemoryChallengesEventPublisher } from '../../../stubs/in-memory-challenges-event-publisher.js';
import { InMemoryMetricsQueryService } from '../../../stubs/in-memory-metrics-query-service.js';
import { makeChallenge } from '../../../helpers/make-challenge.js';
import { makeChallengeParticipation } from '../../../helpers/make-challenge-participation.js';

describe('OnWorkoutExecutionRecorded', () => {
  let challengeRepo: InMemoryChallengeRepository;
  let participationRepo: InMemoryChallengeParticipationRepository;
  let metricsService: InMemoryMetricsQueryService;
  let publisher: InMemoryChallengesEventPublisher;
  let updateProgressUseCase: UpdateChallengeProgressUseCase;
  let handler: OnWorkoutExecutionRecorded;

  beforeEach(() => {
    challengeRepo = new InMemoryChallengeRepository();
    participationRepo = new InMemoryChallengeParticipationRepository();
    metricsService = new InMemoryMetricsQueryService();
    publisher = new InMemoryChallengesEventPublisher();
    updateProgressUseCase = new UpdateChallengeProgressUseCase(
      challengeRepo,
      participationRepo,
      publisher,
    );
    handler = new OnWorkoutExecutionRecorded(
      challengeRepo,
      participationRepo,
      metricsService,
      updateProgressUseCase,
    );
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

  it('updates progress using absolute count from metrics service (idempotent)', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );
    metricsService.workoutCount = 3;

    await handler.handle({ userId, executionId: generateId() });

    const p = await participationRepo.findByChallengeAndUser(challenge.id, userId);
    expect(p!.currentProgress).toBe(3);
    expect(publisher.progressUpdatedEvents).toHaveLength(1);
  });

  it('is idempotent: delivering the same event twice does not double-count', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge();
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );
    metricsService.workoutCount = 1;

    const event = { userId, executionId: generateId() };
    await handler.handle(event);
    await handler.handle(event); // duplicate delivery

    const p = await participationRepo.findByChallengeAndUser(challenge.id, userId);
    // Second delivery: newProgressValue = 1 = currentProgress → rejected as no-decrease (no-op)
    expect(p!.currentProgress).toBe(1);
    expect(publisher.progressUpdatedEvents).toHaveLength(1);
  });

  it('skips participations that have already been completed', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge({ goalTargetValue: 5 });
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 5,
        completedAtUtc: new Date(),
      }),
    );
    metricsService.workoutCount = 6;

    await handler.handle({ userId, executionId: generateId() });

    expect(publisher.progressUpdatedEvents).toHaveLength(0);
  });

  it('skips users not participating in any WORKOUT_COUNT challenge', async () => {
    const challenge = makeActiveChallenge({ goalMetricType: 'WORKOUT_COUNT' });
    challengeRepo.items.push(challenge);
    // No participation added

    await handler.handle({ userId: generateId(), executionId: generateId() });

    expect(publisher.progressUpdatedEvents).toHaveLength(0);
  });

  it('ignores challenges with non-WORKOUT_COUNT metric type', async () => {
    const userId = generateId();
    const challenge = makeActiveChallenge({ goalMetricType: 'STREAK_DAYS' });
    challengeRepo.items.push(challenge);
    participationRepo.items.push(
      makeChallengeParticipation({
        challengeId: challenge.id,
        userId,
        currentProgress: 0,
        completedAtUtc: null,
      }),
    );
    metricsService.workoutCount = 5;

    await handler.handle({ userId, executionId: generateId() });

    expect(publisher.progressUpdatedEvents).toHaveLength(0);
  });
});
