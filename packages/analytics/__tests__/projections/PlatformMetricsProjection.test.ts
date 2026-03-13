import { describe, it, expect, vi } from 'vitest';
import { PlatformMetricsProjection } from '../../application/projections/PlatformMetricsProjection.js';
import type { IPlatformMetricsReadModel } from '../../application/read-models/IPlatformMetricsReadModel.js';
import type { EngagementScoreCalculatedEvent } from '@fittrack/engagement';

function makeReadModel(): IPlatformMetricsReadModel {
  return {
    findByDate: vi.fn(),
    findDateRange: vi.fn(),
    incrementCounters: vi.fn().mockResolvedValue(undefined),
  };
}

function makeScoreEvent(overrides: Partial<EngagementScoreCalculatedEvent['payload']> = {}): EngagementScoreCalculatedEvent {
  return {
    aggregateId: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    eventType: 'EngagementScoreCalculated',
    aggregateType: 'UserEngagement',
    payload: {
      userId: '550e8400-e29b-41d4-a716-446655440001',
      overallScore: 65,
      engagementLevel: 'HIGH',
      trend: 'STABLE',
      trendPercentage: null,
      workoutScore: 75,
      habitScore: 60,
      goalProgressScore: 70,
      streakScore: 50,
      workoutsCompleted: 3,
      nutritionLogsCreated: 4,
      bookingsAttended: 2,
      currentStreak: 10,
      activeGoalsCount: 2,
      goalsOnTrackCount: 2,
      windowStartDate: '2026-03-05',
      windowEndDate: '2026-03-12',
      calculatedAtUtc: '2026-03-12T14:30:00Z',
      isAtRisk: false,
      ...overrides,
    },
  } as unknown as EngagementScoreCalculatedEvent;
}

describe('PlatformMetricsProjection', () => {
  describe('onEngagementScoreCalculated', () => {
    it('calls incrementCounters with date extracted from calculatedAtUtc', async () => {
      const rm = makeReadModel();
      const proj = new PlatformMetricsProjection(rm);

      await proj.onEngagementScoreCalculated(makeScoreEvent());

      expect(rm.incrementCounters).toHaveBeenCalledOnce();
      const call = vi.mocked(rm.incrementCounters).mock.calls[0][0];
      expect(call.metricDate).toBe('2026-03-12');
    });

    it('passes engagementLevel and isAtRisk correctly', async () => {
      const rm = makeReadModel();
      const proj = new PlatformMetricsProjection(rm);

      await proj.onEngagementScoreCalculated(makeScoreEvent({ engagementLevel: 'VERY_LOW', isAtRisk: true, overallScore: 10 }));

      const call = vi.mocked(rm.incrementCounters).mock.calls[0][0];
      expect(call.engagementLevel).toBe('VERY_LOW');
      expect(call.isAtRisk).toBe(true);
      expect(call.overallScore).toBe(10);
    });

    it('passes calculatedAtUtc to incrementCounters', async () => {
      const rm = makeReadModel();
      const proj = new PlatformMetricsProjection(rm);

      await proj.onEngagementScoreCalculated(makeScoreEvent({ calculatedAtUtc: '2026-03-12T14:30:00Z' }));

      const call = vi.mocked(rm.incrementCounters).mock.calls[0][0];
      expect(call.calculatedAtUtc).toBe('2026-03-12T14:30:00Z');
    });
  });
});
