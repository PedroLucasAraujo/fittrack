import { describe, it, expect, vi } from 'vitest';
import { OnStreakBroken } from '../../../application/event-handlers/OnStreakBroken.js';
import type { CalculateUserEngagementUseCase } from '../../../application/use-cases/CalculateUserEngagementUseCase.js';
import { right } from '@fittrack/core';

function makeUseCase(): CalculateUserEngagementUseCase {
  return {
    execute: vi.fn().mockResolvedValue(right({
      engagementId: 'id',
      userId: 'user-1',
      overallScore: 65,
      engagementLevel: 'HIGH',
      trend: 'STABLE',
      trendPercentage: null,
      isAtRisk: false,
      calculatedAtUtc: '2026-03-09T00:00:00.000Z',
    })),
  } as unknown as CalculateUserEngagementUseCase;
}

describe('OnStreakBroken', () => {
  it('triggers recalculation when previousStreak >= 30', async () => {
    const useCase = makeUseCase();
    const handler = new OnStreakBroken(useCase);

    await handler.handle({
      userId: 'user-1',
      professionalProfileId: 'prof-1',
      previousStreak: 30,
    });

    expect(useCase.execute).toHaveBeenCalledOnce();
    expect(useCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      professionalProfileId: 'prof-1',
    });
  });

  it('skips recalculation when previousStreak < 30', async () => {
    const useCase = makeUseCase();
    const handler = new OnStreakBroken(useCase);

    await handler.handle({
      userId: 'user-1',
      professionalProfileId: 'prof-1',
      previousStreak: 29,
    });

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('skips recalculation when previousStreak is 0', async () => {
    const useCase = makeUseCase();
    const handler = new OnStreakBroken(useCase);

    await handler.handle({
      userId: 'user-1',
      professionalProfileId: 'prof-1',
      previousStreak: 0,
    });

    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('logs error but does not throw when use case fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { left } = await import('@fittrack/core');
    const { InvalidEngagementError } = await import('../../../domain/errors/InvalidEngagementError.js');

    const useCase = {
      execute: vi.fn().mockResolvedValue(left(new InvalidEngagementError('fail'))),
    } as unknown as CalculateUserEngagementUseCase;

    const handler = new OnStreakBroken(useCase);
    await handler.handle({ userId: 'user-1', professionalProfileId: 'prof-1', previousStreak: 45 });

    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});
