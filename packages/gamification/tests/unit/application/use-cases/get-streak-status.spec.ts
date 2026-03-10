import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { GetStreakStatus } from '../../../../application/use-cases/get-streak-status.js';
import { InMemoryStreakTrackerRepository } from '../../../repositories/in-memory-streak-tracker-repository.js';
import { makeStreakTracker } from '../../../helpers/make-streak-tracker.js';

afterEach(() => vi.restoreAllMocks());

describe('GetStreakStatus', () => {
  it('rejects invalid userId', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const result = await new GetStreakStatus(repo).execute({ userId: 'bad' });
    expect(result.isLeft()).toBe(true);
  });

  it('returns zeroed DTO when no tracker exists', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const result = await new GetStreakStatus(repo).execute({ userId: generateId() });
    expect(result.isRight()).toBe(true);
    const dto = result.value as ReturnType<typeof result.value>;
    expect(dto).toMatchObject({
      currentStreak: 0,
      longestStreak: 0,
      freezeTokenCount: 0,
      isActive: false,
      isAtRisk: false,
      lastActivityDay: null,
    });
  });

  it('returns correct status for active streak', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const repo = new InMemoryStreakTrackerRepository();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDay: '2025-03-09', // yesterday → active, not at risk
        streakStartDay: '2025-03-05',
        freezeTokenCount: 1,
      }),
    );

    const result = await new GetStreakStatus(repo).execute({ userId });
    expect(result.isRight()).toBe(true);
    const dto = result.value as { currentStreak: number; isActive: boolean; isAtRisk: boolean };
    expect(dto.currentStreak).toBe(5);
    expect(dto.isActive).toBe(true);
    expect(dto.isAtRisk).toBe(false);
  });

  it('marks streak as at risk when lastActivityDay < yesterday', async () => {
    vi.setSystemTime(new Date('2025-03-10T12:00:00Z'));
    const repo = new InMemoryStreakTrackerRepository();
    const userId = generateId();
    repo.items.push(
      makeStreakTracker({
        userId,
        currentStreak: 5,
        lastActivityDay: '2025-03-08', // 2 days ago → at risk
      }),
    );

    const result = await new GetStreakStatus(repo).execute({ userId });
    expect((result.value as { isAtRisk: boolean }).isAtRisk).toBe(true);
  });

  it('returns correct daysUntilNextFreezeToken', async () => {
    const repo = new InMemoryStreakTrackerRepository();
    const userId = generateId();
    repo.items.push(makeStreakTracker({ userId, currentStreak: 4 }));

    const result = await new GetStreakStatus(repo).execute({ userId });
    expect((result.value as { daysUntilNextFreezeToken: number }).daysUntilNextFreezeToken).toBe(3);
  });
});
