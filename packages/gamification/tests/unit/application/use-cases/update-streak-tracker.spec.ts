import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { UpdateStreakTracker } from '../../../../application/use-cases/update-streak-tracker.js';
import { InMemoryStreakTrackerRepository } from '../../../repositories/in-memory-streak-tracker-repository.js';
import { InMemoryGamificationEventPublisher } from '../../../stubs/in-memory-gamification-event-publisher.js';
import { makeStreakTracker } from '../../../helpers/make-streak-tracker.js';

afterEach(() => vi.restoreAllMocks());

function makeUseCase() {
  const repo = new InMemoryStreakTrackerRepository();
  const publisher = new InMemoryGamificationEventPublisher();
  const useCase = new UpdateStreakTracker(repo, publisher);
  return { repo, publisher, useCase };
}

describe('UpdateStreakTracker', () => {
  it('rejects invalid userId', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({
      userId: 'not-a-uuid',
      activityDay: '2025-03-10',
      executionId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects invalid activityDay format', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({
      userId: generateId(),
      activityDay: 'not-a-date',
      executionId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('allows activityDay 1 day ahead of UTC (UTC+ timezone buffer — ADR-0010 §2)', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { useCase } = makeUseCase();
    // March 11 is "tomorrow" UTC — allowed for users in UTC+ timezones
    const result = await useCase.execute({
      userId: generateId(),
      activityDay: '2025-03-11',
      executionId: generateId(),
    });
    expect(result.isRight()).toBe(true);
  });

  it('rejects activityDay more than 1 day in the future', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { useCase } = makeUseCase();
    const result = await useCase.execute({
      userId: generateId(),
      activityDay: '2025-03-12', // 2 days ahead of UTC today — too far
      executionId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('rejects activityDay older than 2 days', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { useCase } = makeUseCase();
    const result = await useCase.execute({
      userId: generateId(),
      activityDay: '2025-03-07', // 3 days ago
      executionId: generateId(),
    });
    expect(result.isLeft()).toBe(true);
  });

  it('accepts retroactive activity within 2 days', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { useCase } = makeUseCase();
    const userId = generateId();
    const result = await useCase.execute({
      userId,
      activityDay: '2025-03-08', // 2 days ago — within window
      executionId: generateId(),
    });
    expect(result.isRight()).toBe(true);
  });

  it('creates new tracker on first activity', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, publisher, useCase } = makeUseCase();
    const userId = generateId();

    const result = await useCase.execute({
      userId,
      activityDay: '2025-03-10',
      executionId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('currentStreak', 1);
    expect(result.value).toHaveProperty('wasNoop', false);
    expect(repo.items).toHaveLength(1);
    expect(publisher.streakIncrementedEvents).toHaveLength(1);
    expect(publisher.streakIncrementedEvents[0]!.payload.currentStreak).toBe(1);
  });

  it('returns wasNoop=true for duplicate activityDay', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 5,
        lastActivityDay: '2025-03-10',
        longestStreak: 5,
      }),
    );

    const result = await useCase.execute({
      userId,
      activityDay: '2025-03-10',
      executionId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('wasNoop', true);
    expect(publisher.streakIncrementedEvents).toHaveLength(0);
  });

  it('increments streak for consecutive day and emits event', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 4,
        lastActivityDay: '2025-03-09',
        longestStreak: 4,
      }),
    );

    const result = await useCase.execute({
      userId,
      activityDay: '2025-03-10',
      executionId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('currentStreak', 5);
    expect(publisher.streakIncrementedEvents).toHaveLength(1);
  });

  it('emits FreezeTokenEarnedEvent at 7-day milestone', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 6,
        lastActivityDay: '2025-03-09',
        longestStreak: 6,
        freezeTokenCount: 0,
      }),
    );

    await useCase.execute({ userId, activityDay: '2025-03-10', executionId: generateId() });

    expect(publisher.freezeTokenEarnedEvents).toHaveLength(1);
    expect(publisher.freezeTokenEarnedEvents[0]!.payload.currentStreak).toBe(7);
  });

  it('emits StreakBrokenEvent + StreakIncrementedEvent when gap is detected', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 10,
        lastActivityDay: '2025-03-07',
        longestStreak: 10,
      }),
    );

    const result = await useCase.execute({
      userId,
      activityDay: '2025-03-10',
      executionId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    expect(publisher.streakBrokenEvents).toHaveLength(1);
    expect(publisher.streakBrokenEvents[0]!.payload.previousStreak).toBe(10);
    expect(publisher.streakIncrementedEvents).toHaveLength(1);
    expect(publisher.streakIncrementedEvents[0]!.payload.currentStreak).toBe(1);
  });
});
