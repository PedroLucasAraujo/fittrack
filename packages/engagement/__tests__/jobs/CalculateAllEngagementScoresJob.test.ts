import { describe, it, expect, vi } from 'vitest';
import { left, right } from '@fittrack/core';
import { CalculateAllEngagementScoresJob } from '../../jobs/CalculateAllEngagementScoresJob.js';
import { UserEngagement } from '../../domain/aggregates/UserEngagement.js';
import { InvalidEngagementError } from '../../domain/errors/InvalidEngagementError.js';
import type { IUserEngagementRepository } from '../../domain/repositories/IUserEngagementRepository.js';
import type { CalculateUserEngagementUseCase } from '../../application/use-cases/CalculateUserEngagementUseCase.js';

function makeEngagement(userId: string, profId: string): UserEngagement {
  return UserEngagement.create({ userId, professionalProfileId: profId }).value as UserEngagement;
}

function makeRepo(userIds: string[], engagements: Map<string, UserEngagement>): IUserEngagementRepository {
  return {
    findActiveUsers: vi.fn().mockResolvedValue(userIds),
    findByUser: vi.fn().mockImplementation((id: string) => Promise.resolve(engagements.get(id) ?? null)),
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findAtRisk: vi.fn(),
  };
}

function makeUseCase(succeed = true): CalculateUserEngagementUseCase {
  return {
    execute: vi.fn().mockResolvedValue(
      succeed
        ? right({ engagementId: 'id', userId: 'u', overallScore: 65, engagementLevel: 'HIGH', trend: 'STABLE', trendPercentage: null, isAtRisk: false, calculatedAtUtc: '' })
        : left(new InvalidEngagementError('test error')),
    ),
  } as unknown as CalculateUserEngagementUseCase;
}

describe('CalculateAllEngagementScoresJob', () => {
  it('has correct name and schedule', () => {
    const job = new CalculateAllEngagementScoresJob({} as any, {} as any);
    expect(job.name).toBe('CalculateAllEngagementScores');
    expect(job.schedule).toBe('0 0 * * *');
  });

  it('returns success with counts when all succeed', async () => {
    const e1 = makeEngagement('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010');
    const e2 = makeEngagement('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010');

    const engMap = new Map([
      ['550e8400-e29b-41d4-a716-446655440001', e1],
      ['550e8400-e29b-41d4-a716-446655440002', e2],
    ]);

    const repo = makeRepo(['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'], engMap);
    const useCase = makeUseCase(true);
    const job = new CalculateAllEngagementScoresJob(repo, useCase);

    const result = await job.execute();
    expect(result.isSuccess).toBe(true);
    expect(result.data?.total).toBe(2);
    expect(result.data?.succeeded).toBe(2);
    expect(result.data?.failed).toBe(0);
  });

  it('skips users without existing engagement aggregates', async () => {
    const repo = makeRepo(['550e8400-e29b-41d4-a716-446655440001'], new Map());
    const useCase = makeUseCase(true);
    const job = new CalculateAllEngagementScoresJob(repo, useCase);

    const result = await job.execute();
    expect(result.isSuccess).toBe(true);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('returns failure when findActiveUsers throws', async () => {
    const repo = {
      findActiveUsers: vi.fn().mockRejectedValue(new Error('DB down')),
      findByUser: vi.fn(),
    } as any;
    const job = new CalculateAllEngagementScoresJob(repo, {} as any);
    const result = await job.execute();
    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toBe('DB down');
  });

  it('returns failure when findActiveUsers throws a non-Error value', async () => {
    const repo = {
      findActiveUsers: vi.fn().mockRejectedValue('plain string error'),
      findByUser: vi.fn(),
    } as any;
    const job = new CalculateAllEngagementScoresJob(repo, {} as any);
    const result = await job.execute();
    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toBe('plain string error');
  });

  it('records unknown error message when rejection reason has no message', async () => {
    const e1 = makeEngagement('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010');
    const engMap = new Map([['550e8400-e29b-41d4-a716-446655440001', e1]]);
    const repo = makeRepo(['550e8400-e29b-41d4-a716-446655440001'], engMap);

    const useCase = {
      execute: vi.fn().mockRejectedValue({ noMessage: true }),
    } as unknown as CalculateUserEngagementUseCase;

    const job = new CalculateAllEngagementScoresJob(repo, useCase);
    const result = await job.execute();
    expect(result.isSuccess).toBe(true);
    expect(result.data?.failed).toBe(1);
    const errors = result.data?.errors as Array<{ index: number; error: string }>;
    expect(errors[0].error).toBe('Unknown error');
  });

  it('counts partial failures correctly', async () => {
    const e1 = makeEngagement('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010');
    const engMap = new Map([['550e8400-e29b-41d4-a716-446655440001', e1]]);
    const repo = makeRepo(['550e8400-e29b-41d4-a716-446655440001'], engMap);

    const useCase = {
      execute: vi.fn().mockResolvedValue(left(new InvalidEngagementError('calc error'))),
    } as unknown as CalculateUserEngagementUseCase;

    const job = new CalculateAllEngagementScoresJob(repo, useCase);
    const result = await job.execute();
    expect(result.isSuccess).toBe(true);
    expect(result.data?.failed).toBe(1);
    expect(result.data?.succeeded).toBe(0);
  });
});
