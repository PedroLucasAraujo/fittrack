import { describe, it, expect, vi, beforeEach } from 'vitest';
import { right, left } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { CalculateUserEngagementUseCase } from '../../../application/use-cases/CalculateUserEngagementUseCase.js';
import { UserEngagement } from '../../../domain/aggregates/UserEngagement.js';
import { InvalidEngagementError } from '../../../domain/errors/InvalidEngagementError.js';
import type { IUserEngagementRepository } from '../../../domain/repositories/IUserEngagementRepository.js';
import type { IEngagementDataQueryService } from '../../../domain/services/IEngagementDataQueryService.js';
import type { IEngagementEventPublisher } from '../../../application/ports/IEngagementEventPublisher.js';

function makeRepo(engagement: UserEngagement | null = null): IUserEngagementRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByUser: vi.fn().mockResolvedValue(engagement),
    findAll: vi.fn().mockResolvedValue([]),
    findActiveUsers: vi.fn().mockResolvedValue([]),
    findAtRisk: vi.fn().mockResolvedValue([]),
  };
}

function makeQueryService(overrides: Partial<Record<keyof IEngagementDataQueryService, () => Promise<DomainResult<any>>>> = {}): IEngagementDataQueryService {
  const defaults = {
    getWorkoutsInWindow: vi.fn().mockResolvedValue(right(3)),
    getDaysWithNutritionLog: vi.fn().mockResolvedValue(right(5)),
    getNutritionLogsInWindow: vi.fn().mockResolvedValue(right(5)),
    getBookingsAttendedInWindow: vi.fn().mockResolvedValue(right(2)),
    getCurrentStreak: vi.fn().mockResolvedValue(right(12)),
    getActiveGoalsCount: vi.fn().mockResolvedValue(right(2)),
    getGoalsOnTrackCount: vi.fn().mockResolvedValue(right(1)),
    getLastActivityDate: vi.fn().mockResolvedValue(right('2026-03-08')),
    getDaysInactive: vi.fn().mockResolvedValue(right(1)),
  };
  return { ...defaults, ...overrides } as IEngagementDataQueryService;
}

function makePublisher(): IEngagementEventPublisher {
  return {
    publishEngagementScoreCalculated: vi.fn().mockResolvedValue(undefined),
    publishUserDisengaged: vi.fn().mockResolvedValue(undefined),
    publishEngagementImproved: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CalculateUserEngagementUseCase', () => {
  let repo: IUserEngagementRepository;
  let queryService: IEngagementDataQueryService;
  let publisher: IEngagementEventPublisher;
  let useCase: CalculateUserEngagementUseCase;

  beforeEach(() => {
    repo = makeRepo();
    queryService = makeQueryService();
    publisher = makePublisher();
    useCase = new CalculateUserEngagementUseCase(repo, queryService, publisher);
  });

  it('returns error when userId is empty', async () => {
    const result = await useCase.execute({ userId: '', professionalProfileId: 'prof-1' });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidEngagementError);
  });

  it('returns error when professionalProfileId is empty', async () => {
    const result = await useCase.execute({ userId: 'user-1', professionalProfileId: '' });
    expect(result.isLeft()).toBe(true);
  });

  it('creates new engagement when none exists', async () => {
    const result = await useCase.execute({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.isRight()).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();
    expect(publisher.publishEngagementScoreCalculated).toHaveBeenCalledOnce();
  });

  it('loads existing engagement and updates it', async () => {
    const existingEngagement = UserEngagement.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    }).value as UserEngagement;

    repo = makeRepo(existingEngagement);
    useCase = new CalculateUserEngagementUseCase(repo, queryService, publisher);

    const result = await useCase.execute({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.isRight()).toBe(true);
  });

  it('returns output with overallScore and engagementLevel', async () => {
    const result = await useCase.execute({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.isRight()).toBe(true);
    const output = result.value as { overallScore: number; engagementLevel: string };
    expect(typeof output.overallScore).toBe('number');
    expect(typeof output.engagementLevel).toBe('string');
  });

  it('publishes UserDisengagedEvent when churn risk detected', async () => {
    // For Rule 1: need VERY_LOW (score<20) + daysInactive>=7 + DECLINING trend.
    // With activeGoalsCount=1 and goalsOnTrackCount=0, goalProgressScore=0 so overallScore=0.
    queryService = makeQueryService({
      getWorkoutsInWindow: vi.fn().mockResolvedValue(right(0)),
      getDaysWithNutritionLog: vi.fn().mockResolvedValue(right(0)),
      getNutritionLogsInWindow: vi.fn().mockResolvedValue(right(0)),
      getBookingsAttendedInWindow: vi.fn().mockResolvedValue(right(0)),
      getCurrentStreak: vi.fn().mockResolvedValue(right(0)),
      getActiveGoalsCount: vi.fn().mockResolvedValue(right(1)),
      getGoalsOnTrackCount: vi.fn().mockResolvedValue(right(0)),
      getLastActivityDate: vi.fn().mockResolvedValue(right('2026-02-01')),
      getDaysInactive: vi.fn().mockResolvedValue(right(35)),
    });
    publisher = makePublisher();

    // Simulate existing engagement with DECLINING trend by using a previous score
    const existingEngagement = UserEngagement.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    }).value as UserEngagement;

    // Add history with high previous score so delta will be strongly negative
    const { EngagementScore } = await import('../../../domain/value-objects/EngagementScore.js');
    const { DaysInactive } = await import('../../../domain/value-objects/DaysInactive.js');
    existingEngagement.updateScores({
      workoutScore: EngagementScore.create(80).value as any,
      habitScore: EngagementScore.create(70).value as any,
      goalProgressScore: EngagementScore.create(60).value as any,
      streakScore: EngagementScore.create(50).value as any,
      workoutsCompleted: 4,
      nutritionLogsCreated: 7,
      bookingsAttended: 2,
      currentStreak: 15,
      activeGoalsCount: 2,
      goalsOnTrackCount: 2,
      windowStartDate: '2026-02-24',
      windowEndDate: '2026-03-02',
      calculatedAtUtc: '2026-03-02T00:00:00.000Z',
      daysInactive: DaysInactive.create(0).value as any,
      lastActivityDate: '2026-03-02',
      previousWeekScore: null,
    });
    existingEngagement.addHistorySnapshot();

    repo = makeRepo(existingEngagement);
    useCase = new CalculateUserEngagementUseCase(repo, queryService, publisher);

    await useCase.execute({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    });

    expect(publisher.publishUserDisengaged).toHaveBeenCalledOnce();
  });

  it('publishes EngagementImprovedEvent when improvement >= 20%', async () => {
    const existingEngagement = UserEngagement.create({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    }).value as UserEngagement;

    // Set history with low previous score
    const { EngagementScore } = await import('../../../domain/value-objects/EngagementScore.js');
    const { DaysInactive } = await import('../../../domain/value-objects/DaysInactive.js');
    existingEngagement.updateScores({
      workoutScore: EngagementScore.create(20).value as any,
      habitScore: EngagementScore.create(20).value as any,
      goalProgressScore: EngagementScore.create(20).value as any,
      streakScore: EngagementScore.create(20).value as any,
      workoutsCompleted: 1,
      nutritionLogsCreated: 1,
      bookingsAttended: 0,
      currentStreak: 2,
      activeGoalsCount: 1,
      goalsOnTrackCount: 0,
      windowStartDate: '2026-02-24',
      windowEndDate: '2026-03-02',
      calculatedAtUtc: '2026-03-02T00:00:00.000Z',
      daysInactive: DaysInactive.create(2).value as any,
      lastActivityDate: '2026-03-02',
      previousWeekScore: null,
    });
    existingEngagement.addHistorySnapshot();

    repo = makeRepo(existingEngagement);
    useCase = new CalculateUserEngagementUseCase(repo, queryService, publisher);

    // Now high scores → improvement from 20 to 63+ = >20%
    await useCase.execute({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    });

    expect(publisher.publishEngagementImproved).toHaveBeenCalledOnce();
  });

  const failureKeys: Array<keyof ReturnType<typeof makeQueryService>> = [
    'getWorkoutsInWindow',
    'getDaysWithNutritionLog',
    'getNutritionLogsInWindow',
    'getBookingsAttendedInWindow',
    'getCurrentStreak',
    'getActiveGoalsCount',
    'getGoalsOnTrackCount',
    'getLastActivityDate',
    'getDaysInactive',
  ];

  for (const key of failureKeys) {
    it(`returns Left when ${key} fails`, async () => {
      queryService = makeQueryService({
        [key]: vi.fn().mockResolvedValue(left(new InvalidEngagementError('DB error'))),
      });
      useCase = new CalculateUserEngagementUseCase(repo, queryService, publisher);

      const result = await useCase.execute({
        userId: '550e8400-e29b-41d4-a716-446655440001',
        professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
      });
      expect(result.isLeft()).toBe(true);
    });
  }

  it('handles null lastActivityDate from query service', async () => {
    queryService = makeQueryService({
      getLastActivityDate: vi.fn().mockResolvedValue(right(null)),
    });
    useCase = new CalculateUserEngagementUseCase(repo, queryService, publisher);

    const result = await useCase.execute({
      userId: '550e8400-e29b-41d4-a716-446655440001',
      professionalProfileId: '550e8400-e29b-41d4-a716-446655440002',
    });
    expect(result.isRight()).toBe(true);
  });
});
