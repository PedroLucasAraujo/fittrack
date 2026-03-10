import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { UseStreakFreezeToken } from '../../../../application/use-cases/use-streak-freeze-token.js';
import { InMemoryStreakTrackerRepository } from '../../../repositories/in-memory-streak-tracker-repository.js';
import { InMemoryGamificationEventPublisher } from '../../../stubs/in-memory-gamification-event-publisher.js';
import { makeStreakTracker } from '../../../helpers/make-streak-tracker.js';

afterEach(() => vi.restoreAllMocks());

function makeUseCase() {
  const repo = new InMemoryStreakTrackerRepository();
  const publisher = new InMemoryGamificationEventPublisher();
  const useCase = new UseStreakFreezeToken(repo, publisher);
  return { repo, publisher, useCase };
}

describe('UseStreakFreezeToken', () => {
  it('rejects invalid userId', async () => {
    const { useCase } = makeUseCase();
    expect((await useCase.execute({ userId: 'bad' })).isLeft()).toBe(true);
  });

  it('returns StreakTrackerNotFoundError when no tracker exists', async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({ userId: generateId() });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toHaveProperty('code', 'GAMIFICATION.STREAK_TRACKER_NOT_FOUND');
  });

  it('returns error when no freeze tokens available', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 5,
        lastActivityDay: '2025-03-08',
        freezeTokenCount: 0,
      }),
    );

    const result = await useCase.execute({ userId });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toHaveProperty('code', 'GAMIFICATION.NO_FREEZE_TOKENS_AVAILABLE');
  });

  it('returns error when streak is not at risk', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 5,
        lastActivityDay: '2025-03-09', // yesterday → not at risk
        freezeTokenCount: 1,
      }),
    );

    const result = await useCase.execute({ userId });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toHaveProperty('code', 'GAMIFICATION.STREAK_NOT_AT_RISK');
  });

  it('consumes token and emits FreezeTokenUsedEvent on success', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const { repo, publisher, useCase } = makeUseCase();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 5,
        lastActivityDay: '2025-03-08', // at risk
        freezeTokenCount: 1,
      }),
    );

    const result = await useCase.execute({ userId });

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveProperty('currentStreak', 5);
    expect(result.value).toHaveProperty('freezeTokensRemaining', 0);
    expect(publisher.freezeTokenUsedEvents).toHaveLength(1);
    expect(publisher.freezeTokenUsedEvents[0]!.payload.freezeTokenCount).toBe(0);
  });
});
