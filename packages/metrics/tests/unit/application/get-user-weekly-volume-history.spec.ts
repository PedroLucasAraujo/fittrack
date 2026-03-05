import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { GetUserWeeklyVolumeHistory } from '../../../application/use-cases/get-user-weekly-volume-history.js';
import { Metric } from '../../../domain/aggregates/metric.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { InMemoryMetricRepository } from '../../repositories/in-memory-metric-repository.js';

function makeWeeklyVolumeMetric(
  userId: string,
  professionalProfileId: string,
  weekStartDate: string,
  volume: number,
): Metric {
  const logDayResult = LogicalDay.create(weekStartDate);
  if (logDayResult.isLeft()) throw new Error('bad date');
  const result = Metric.create({
    clientId: userId,
    professionalProfileId,
    metricType: MetricType.WEEKLY_VOLUME,
    value: volume,
    unit: 'session',
    derivationRuleVersion: 'v1',
    sourceExecutionIds: [generateId()],
    computedAtUtc: UTCDateTime.now(),
    logicalDay: logDayResult.value,
    timezoneUsed: 'UTC',
  });
  if (result.isLeft()) throw new Error('create failed');
  return result.value;
}

describe('GetUserWeeklyVolumeHistory', () => {
  let repo: InMemoryMetricRepository;
  let useCase: GetUserWeeklyVolumeHistory;

  beforeEach(() => {
    repo = new InMemoryMetricRepository();
    useCase = new GetUserWeeklyVolumeHistory(repo);
  });

  it('returns empty history when no metrics exist', async () => {
    const result = await useCase.execute({
      userId: generateId(),
      professionalProfileId: generateId(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.history).toHaveLength(0);
    }
  });

  it('returns history ordered most-recent-first', async () => {
    const userId = generateId();
    const professionalProfileId = generateId();

    repo.items.push(makeWeeklyVolumeMetric(userId, professionalProfileId, '2026-01-19', 1000));
    repo.items.push(makeWeeklyVolumeMetric(userId, professionalProfileId, '2026-02-02', 2000));
    repo.items.push(makeWeeklyVolumeMetric(userId, professionalProfileId, '2026-02-09', 1500));

    const result = await useCase.execute({ userId, professionalProfileId, lastNWeeks: 3 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const { history } = result.value;
      expect(history).toHaveLength(3);
      expect(history[0]!.weekStartDate).toBe('2026-02-09'); // most recent first
      expect(history[0]!.totalVolume).toBe(1500);
    }
  });

  it('respects lastNWeeks limit', async () => {
    const userId = generateId();
    const professionalProfileId = generateId();

    for (let i = 1; i <= 6; i++) {
      const _date = `2026-0${i}-06`;
      try {
        repo.items.push(
          makeWeeklyVolumeMetric(userId, professionalProfileId, `2026-0${i}-06`, 1000),
        );
      } catch {
        // skip invalid dates
      }
    }

    const result = await useCase.execute({ userId, professionalProfileId, lastNWeeks: 2 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.history.length).toBeLessThanOrEqual(2);
    }
  });

  it('defaults to 4 weeks when lastNWeeks is not provided', async () => {
    const userId = generateId();
    const professionalProfileId = generateId();

    for (let i = 0; i < 6; i++) {
      const monday = `2026-0${i + 1}-06`;
      try {
        repo.items.push(makeWeeklyVolumeMetric(userId, professionalProfileId, monday, 1000));
      } catch {
        /* ignore */
      }
    }

    const result = await useCase.execute({ userId, professionalProfileId });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.history.length).toBeLessThanOrEqual(4);
    }
  });

  it('returns Left when userId is invalid', async () => {
    const result = await useCase.execute({
      userId: 'not-a-uuid',
      professionalProfileId: generateId(),
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(MetricErrorCodes.COMPUTATION_FAILED);
    }
  });

  it('returns Left when professionalProfileId is invalid', async () => {
    const result = await useCase.execute({
      userId: generateId(),
      professionalProfileId: 'bad',
    });

    expect(result.isLeft()).toBe(true);
  });

  it('returns Left when lastNWeeks is 0', async () => {
    const result = await useCase.execute({
      userId: generateId(),
      professionalProfileId: generateId(),
      lastNWeeks: 0,
    });

    expect(result.isLeft()).toBe(true);
  });

  it('does not cross tenant boundaries', async () => {
    const userId = generateId();
    const tenantA = generateId();
    const tenantB = generateId();

    repo.items.push(makeWeeklyVolumeMetric(userId, tenantA, '2026-02-16', 1000));

    const result = await useCase.execute({ userId, professionalProfileId: tenantB });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.history).toHaveLength(0);
    }
  });
});
