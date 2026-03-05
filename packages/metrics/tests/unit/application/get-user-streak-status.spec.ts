import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { GetUserStreakStatus } from '../../../application/use-cases/get-user-streak-status.js';
import { Metric } from '../../../domain/aggregates/metric.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { InMemoryMetricRepository } from '../../repositories/in-memory-metric-repository.js';

function makeStreakMetric(
  userId: string,
  professionalProfileId: string,
  currentStreak: number,
  anchorDate: string,
): Metric {
  const logDayResult = LogicalDay.create(anchorDate);
  if (logDayResult.isLeft()) throw new Error('bad date');
  const result = Metric.create({
    clientId: userId,
    professionalProfileId,
    metricType: MetricType.STREAK_DAYS,
    value: currentStreak,
    unit: 'day',
    derivationRuleVersion: 'v1',
    sourceExecutionIds: [generateId()],
    computedAtUtc: UTCDateTime.now(),
    logicalDay: logDayResult.value,
    timezoneUsed: 'UTC',
  });
  if (result.isLeft()) throw new Error('create failed');
  return result.value;
}

describe('GetUserStreakStatus', () => {
  let repo: InMemoryMetricRepository;
  let useCase: GetUserStreakStatus;

  beforeEach(() => {
    repo = new InMemoryMetricRepository();
    useCase = new GetUserStreakStatus(repo);
  });

  it('returns zero state when no streak metric exists', async () => {
    const result = await useCase.execute({
      userId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.currentStreak).toBe(0);
      expect(result.value.longestStreak).toBe(0);
      expect(result.value.streakStatus).toBe('NEVER_STARTED');
      expect(result.value.lastActivityDate).toBeNull();
    }
  });

  it('returns ACTIVE status when streak > 0', async () => {
    const userId = generateId();
    const professionalProfileId = generateId();
    repo.items.push(makeStreakMetric(userId, professionalProfileId, 5, '2026-02-22'));

    const result = await useCase.execute({ userId, professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.currentStreak).toBe(5);
      expect(result.value.streakStatus).toBe('ACTIVE');
      expect(result.value.lastActivityDate).toBe('2026-02-22');
    }
  });

  it('returns BROKEN status when streak = 0', async () => {
    const userId = generateId();
    const professionalProfileId = generateId();
    repo.items.push(makeStreakMetric(userId, professionalProfileId, 0, '2026-02-22'));

    const result = await useCase.execute({ userId, professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.streakStatus).toBe('BROKEN');
    }
  });

  it('returns Left when userId is not a valid UUIDv4', async () => {
    const result = await useCase.execute({
      userId: 'invalid',
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(MetricErrorCodes.COMPUTATION_FAILED);
    }
  });

  it('returns Left when professionalProfileId is not a valid UUIDv4', async () => {
    const result = await useCase.execute({
      userId: generateId(),
      professionalProfileId: 'bad',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('does not cross tenant boundaries', async () => {
    const userId = generateId();
    const tenantA = generateId();
    const tenantB = generateId();

    repo.items.push(makeStreakMetric(userId, tenantA, 10, '2026-02-22'));

    const result = await useCase.execute({ userId, professionalProfileId: tenantB });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.currentStreak).toBe(0);
      expect(result.value.streakStatus).toBe('NEVER_STARTED');
    }
  });
});
