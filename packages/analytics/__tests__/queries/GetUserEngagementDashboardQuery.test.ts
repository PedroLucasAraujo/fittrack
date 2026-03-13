import { describe, it, expect, vi } from 'vitest';
import { GetUserEngagementDashboardQuery } from '../../application/queries/GetUserEngagementDashboardQuery.js';
import type { IUserEngagementDashboardReadModel } from '../../application/read-models/IUserEngagementDashboardReadModel.js';

function makeDto() {
  return {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    overallScore: 72,
    engagementLevel: 'HIGH',
    trend: 'STABLE',
    trendPercentage: 2.5,
    workoutScore: 80,
    habitScore: 70,
    goalProgressScore: 65,
    streakScore: 60,
    workoutsCompleted: 3,
    nutritionLogsCreated: 5,
    bookingsAttended: 2,
    currentStreak: 14,
    activeGoalsCount: 2,
    goalsOnTrackCount: 2,
    windowStartDate: '2026-03-05',
    windowEndDate: '2026-03-12',
    isAtRisk: false,
    daysInactive: 0,
    lastActivityDate: '2026-03-12',
    riskDetectedAt: null,
    calculatedAt: '2026-03-12T00:00:00Z',
    updatedAt: '2026-03-12T00:00:00Z',
  };
}

function makeReadModel(dto: ReturnType<typeof makeDto> | null): IUserEngagementDashboardReadModel {
  return {
    findByUserId: vi.fn().mockResolvedValue(dto),
    upsert: vi.fn(),
    markAtRisk: vi.fn(),
  };
}

describe('GetUserEngagementDashboardQuery', () => {
  it('returns right with DTO when found', async () => {
    const dto = makeDto();
    const query = new GetUserEngagementDashboardQuery(makeReadModel(dto));
    const result = await query.execute({ userId: dto.userId });

    expect(result.isRight()).toBe(true);
    expect(result.value).toEqual(dto);
  });

  it('returns left when dashboard not found', async () => {
    const query = new GetUserEngagementDashboardQuery(makeReadModel(null));
    const result = await query.execute({ userId: '550e8400-e29b-41d4-a716-446655440001' });

    expect(result.isLeft()).toBe(true);
  });

  it('left error message references the userId', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const query = new GetUserEngagementDashboardQuery(makeReadModel(null));
    const result = await query.execute({ userId });

    expect(result.isLeft()).toBe(true);
    const err = result.value as Error;
    expect(err.message).toContain(userId);
  });
});
