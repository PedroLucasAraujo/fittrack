import { describe, it, expect, vi } from 'vitest';
import { GetEngagementHistoryUseCase } from '../../../application/use-cases/GetEngagementHistoryUseCase.js';
import { UserEngagement } from '../../../domain/aggregates/UserEngagement.js';
import { EngagementScore } from '../../../domain/value-objects/EngagementScore.js';
import { DaysInactive } from '../../../domain/value-objects/DaysInactive.js';
import { EngagementNotFoundError } from '../../../domain/errors/EngagementNotFoundError.js';
import { InvalidEngagementError } from '../../../domain/errors/InvalidEngagementError.js';
import type { IUserEngagementRepository } from '../../../domain/repositories/IUserEngagementRepository.js';

function makeEngagementWithHistory(weekCount: number): UserEngagement {
  const engagement = UserEngagement.create({
    userId: '550e8400-e29b-41d4-a716-446655440001',
    professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
  }).value as UserEngagement;

  for (let i = 0; i < weekCount; i++) {
    engagement.updateScores({
      workoutScore: EngagementScore.create(60 + i).value as EngagementScore,
      habitScore: EngagementScore.create(50).value as EngagementScore,
      goalProgressScore: EngagementScore.create(50).value as EngagementScore,
      streakScore: EngagementScore.create(40).value as EngagementScore,
      workoutsCompleted: 3,
      nutritionLogsCreated: 4,
      bookingsAttended: 1,
      currentStreak: 7,
      activeGoalsCount: 2,
      goalsOnTrackCount: 1,
      windowStartDate: `2026-0${String(i + 1).padStart(2, '0')}-01`,
      windowEndDate: `2026-0${String(i + 1).padStart(2, '0')}-07`,
      calculatedAtUtc: `2026-0${String(i + 1).padStart(2, '0')}-07T00:00:00.000Z`,
      daysInactive: DaysInactive.create(0).value as DaysInactive,
      lastActivityDate: `2026-0${String(i + 1).padStart(2, '0')}-07`,
      previousWeekScore: i > 0 ? 60 + i - 1 : null,
    });
    engagement.addHistorySnapshot();
  }
  return engagement;
}

describe('GetEngagementHistoryUseCase', () => {
  it('returns Left when userId is empty', async () => {
    const repo: IUserEngagementRepository = { findByUser: vi.fn() } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: '' });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidEngagementError);
  });

  it('returns Left when engagement not found', async () => {
    const repo: IUserEngagementRepository = {
      findByUser: vi.fn().mockResolvedValue(null),
    } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: 'user-1' });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(EngagementNotFoundError);
  });

  it('returns last 8 entries by default', async () => {
    const engagement = makeEngagementWithHistory(10);
    const repo: IUserEngagementRepository = {
      findByUser: vi.fn().mockResolvedValue(engagement),
    } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: 'user-1' });
    expect(result.isRight()).toBe(true);
    expect((result.value as any).history.length).toBe(8);
  });

  it('respects the weeks parameter', async () => {
    const engagement = makeEngagementWithHistory(10);
    const repo: IUserEngagementRepository = {
      findByUser: vi.fn().mockResolvedValue(engagement),
    } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: 'user-1', weeks: 3 });
    expect(result.isRight()).toBe(true);
    expect((result.value as any).history.length).toBe(3);
  });

  it('caps weeks at 12', async () => {
    const engagement = makeEngagementWithHistory(12);
    const repo: IUserEngagementRepository = {
      findByUser: vi.fn().mockResolvedValue(engagement),
    } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: 'user-1', weeks: 20 });
    expect(result.isRight()).toBe(true);
    expect((result.value as any).history.length).toBe(12);
  });

  it('returns empty history when no snapshots exist', async () => {
    const engagement = UserEngagement.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    }).value as UserEngagement;

    const repo: IUserEngagementRepository = {
      findByUser: vi.fn().mockResolvedValue(engagement),
    } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: 'user-1' });
    expect(result.isRight()).toBe(true);
    expect((result.value as any).history.length).toBe(0);
  });

  it('maps history entries to DTOs correctly', async () => {
    const engagement = makeEngagementWithHistory(2);
    const repo: IUserEngagementRepository = {
      findByUser: vi.fn().mockResolvedValue(engagement),
    } as any;
    const useCase = new GetEngagementHistoryUseCase(repo);
    const result = await useCase.execute({ userId: 'user-1', weeks: 2 });
    const history = (result.value as any).history;
    expect(history[0]).toHaveProperty('weekStartDate');
    expect(history[0]).toHaveProperty('overallScore');
    expect(history[0]).toHaveProperty('engagementLevel');
    expect(history[0]).toHaveProperty('workoutsCompleted');
  });
});
