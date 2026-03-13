import { describe, it, expect, vi } from 'vitest';
import { GetPlatformMetricsQuery } from '../../application/queries/GetPlatformMetricsQuery.js';
import type { IPlatformMetricsReadModel, PlatformMetricsDTO } from '../../application/read-models/IPlatformMetricsReadModel.js';

function makeDto(date: string): PlatformMetricsDTO {
  return {
    metricDate: date,
    dailyActiveUsers: 100,
    weeklyActiveUsers: 400,
    monthlyActiveUsers: 1200,
    averageEngagementScore: 65.5,
    veryHighCount: 20,
    highCount: 40,
    mediumCount: 25,
    lowCount: 10,
    veryLowCount: 5,
    atRiskCount: 8,
    calculatedAt: `${date}T00:00:00Z`,
  };
}

function makeReadModel(
  byDate: PlatformMetricsDTO | null,
  range: PlatformMetricsDTO[],
): IPlatformMetricsReadModel {
  return {
    findByDate: vi.fn().mockResolvedValue(byDate),
    findDateRange: vi.fn().mockResolvedValue(range),
    incrementCounters: vi.fn(),
  };
}

describe('GetPlatformMetricsQuery', () => {
  it('returns single metric when date is provided and found', async () => {
    const dto = makeDto('2026-03-12');
    const rm = makeReadModel(dto, []);
    const query = new GetPlatformMetricsQuery(rm);

    const result = await query.execute({ date: '2026-03-12' });

    expect(result.isRight()).toBe(true);
    const output = result.value as any;
    expect(output.metrics).toHaveLength(1);
    expect(output.metrics[0].metricDate).toBe('2026-03-12');
  });

  it('returns left when date is provided but not found', async () => {
    const rm = makeReadModel(null, []);
    const query = new GetPlatformMetricsQuery(rm);

    const result = await query.execute({ date: '2026-03-12' });

    expect(result.isLeft()).toBe(true);
  });

  it('returns range results when no specific date provided', async () => {
    const dto1 = makeDto('2026-03-11');
    const dto2 = makeDto('2026-03-12');
    const rm = makeReadModel(null, [dto2, dto1]);
    const query = new GetPlatformMetricsQuery(rm);

    const result = await query.execute({ startDate: '2026-03-11', endDate: '2026-03-12' });

    expect(result.isRight()).toBe(true);
    const output = result.value as any;
    expect(output.metrics).toHaveLength(2);
    expect(rm.findDateRange).toHaveBeenCalledWith('2026-03-11', '2026-03-12');
  });

  it('returns empty array when range has no data', async () => {
    const rm = makeReadModel(null, []);
    const query = new GetPlatformMetricsQuery(rm);

    const result = await query.execute({ startDate: '2026-01-01', endDate: '2026-01-07' });

    expect(result.isRight()).toBe(true);
    const output = result.value as any;
    expect(output.metrics).toHaveLength(0);
  });

  it('falls back to empty string for missing startDate/endDate', async () => {
    const rm = makeReadModel(null, []);
    const query = new GetPlatformMetricsQuery(rm);

    await query.execute({});

    expect(rm.findDateRange).toHaveBeenCalledWith('', '');
  });
});
