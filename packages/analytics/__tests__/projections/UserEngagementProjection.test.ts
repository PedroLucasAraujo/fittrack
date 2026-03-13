import { describe, it, expect, vi } from 'vitest';
import { UserEngagementProjection } from '../../application/projections/UserEngagementProjection.js';
import type { IUserEngagementDashboardReadModel } from '../../application/read-models/IUserEngagementDashboardReadModel.js';
import type {
  EngagementScoreCalculatedEvent,
  UserDisengagedEvent,
} from '@fittrack/engagement';

function makeReadModel(): IUserEngagementDashboardReadModel {
  return {
    findByUserId: vi.fn(),
    upsert: vi.fn().mockResolvedValue(undefined),
    markAtRisk: vi.fn().mockResolvedValue(undefined),
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
      calculatedAtUtc: '2026-03-12T00:00:00Z',
      isAtRisk: false,
      ...overrides,
    },
  } as unknown as EngagementScoreCalculatedEvent;
}

function makeDisengagedEvent(overrides: Partial<UserDisengagedEvent['payload']> = {}): UserDisengagedEvent {
  return {
    aggregateId: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: '550e8400-e29b-41d4-a716-446655440010',
    eventType: 'UserDisengaged',
    aggregateType: 'UserEngagement',
    payload: {
      userId: '550e8400-e29b-41d4-a716-446655440001',
      engagementLevel: 'VERY_LOW',
      overallScore: 10,
      daysInactive: 10,
      lastActivityDate: '2026-03-02',
      detectedAtUtc: '2026-03-12T00:00:00Z',
      ...overrides,
    },
  } as unknown as UserDisengagedEvent;
}

describe('UserEngagementProjection', () => {
  describe('onEngagementScoreCalculated', () => {
    it('calls upsert with mapped payload', async () => {
      const rm = makeReadModel();
      const proj = new UserEngagementProjection(rm);
      const event = makeScoreEvent();

      await proj.onEngagementScoreCalculated(event);

      expect(rm.upsert).toHaveBeenCalledOnce();
      const call = vi.mocked(rm.upsert).mock.calls[0][0];
      expect(call.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(call.overallScore).toBe(65);
      expect(call.engagementLevel).toBe('HIGH');
      expect(call.isAtRisk).toBe(false);
    });

    it('maps trendPercentage null correctly', async () => {
      const rm = makeReadModel();
      const proj = new UserEngagementProjection(rm);

      await proj.onEngagementScoreCalculated(makeScoreEvent({ trendPercentage: null }));

      const call = vi.mocked(rm.upsert).mock.calls[0][0];
      expect(call.trendPercentage).toBeNull();
    });

    it('maps trendPercentage value correctly', async () => {
      const rm = makeReadModel();
      const proj = new UserEngagementProjection(rm);

      await proj.onEngagementScoreCalculated(makeScoreEvent({ trendPercentage: 15.5 }));

      const call = vi.mocked(rm.upsert).mock.calls[0][0];
      expect(call.trendPercentage).toBe(15.5);
    });
  });

  describe('onUserDisengaged', () => {
    it('calls markAtRisk with mapped payload', async () => {
      const rm = makeReadModel();
      const proj = new UserEngagementProjection(rm);
      const event = makeDisengagedEvent();

      await proj.onUserDisengaged(event);

      expect(rm.markAtRisk).toHaveBeenCalledOnce();
      const call = vi.mocked(rm.markAtRisk).mock.calls[0][0];
      expect(call.userId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(call.daysInactive).toBe(10);
      expect(call.lastActivityDate).toBe('2026-03-02');
      expect(call.riskDetectedAtUtc).toBe('2026-03-12T00:00:00Z');
    });

    it('passes null lastActivityDate when user has no activity', async () => {
      const rm = makeReadModel();
      const proj = new UserEngagementProjection(rm);

      await proj.onUserDisengaged(makeDisengagedEvent({ lastActivityDate: null }));

      const call = vi.mocked(rm.markAtRisk).mock.calls[0][0];
      expect(call.lastActivityDate).toBeNull();
    });
  });
});
