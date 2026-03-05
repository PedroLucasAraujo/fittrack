import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { Metric } from '../../../domain/aggregates/metric.js';
import {
  ComputeStreakMetric,
  computeStreaks,
} from '../../../application/use-cases/compute-streak-metric.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { InMemoryMetricRepository } from '../../repositories/in-memory-metric-repository.js';
import { InMemoryExecutionQueryServiceStub } from '../../stubs/in-memory-execution-query-service-stub.js';
import { InMemoryBatchMetricsEventPublisherStub } from '../../stubs/in-memory-batch-metrics-event-publisher-stub.js';

// ── computeStreaks (pure function) ─────────────────────────────────────────────

describe('computeStreaks()', () => {
  it('returns NEVER_STARTED with 0 streaks when no activity dates', () => {
    const result = computeStreaks([], '2026-02-22');
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.status).toBe('NEVER_STARTED');
    expect(result.lastActivityDate).toBeNull();
  });

  it('computes currentStreak=1 when last activity was yesterday', () => {
    // yesterday = 2026-02-22, activity on 2026-02-22
    const result = computeStreaks(['2026-02-22'], '2026-02-22');
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.status).toBe('ACTIVE');
  });

  it('computes currentStreak=3 for three consecutive days ending yesterday', () => {
    const result = computeStreaks(['2026-02-20', '2026-02-21', '2026-02-22'], '2026-02-22');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.status).toBe('ACTIVE');
  });

  it('computes currentStreak=0 when last activity is before yesterday', () => {
    const result = computeStreaks(['2026-02-20', '2026-02-21'], '2026-02-22');
    expect(result.currentStreak).toBe(0);
    expect(result.status).toBe('BROKEN');
  });

  it('computes longestStreak across a gap in activity', () => {
    // Two runs: 3 days and 2 days
    const dates = ['2026-02-10', '2026-02-11', '2026-02-12', '2026-02-20', '2026-02-21'];
    const result = computeStreaks(dates, '2026-02-22');
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(0); // last date is 2026-02-21, yesterday is 2026-02-22 → not consecutive
  });

  it('deduplicates dates before computing', () => {
    const dates = ['2026-02-22', '2026-02-22', '2026-02-21'];
    const result = computeStreaks(dates, '2026-02-22');
    expect(result.currentStreak).toBe(2);
  });

  it('longestStreak >= currentStreak always', () => {
    const dates = ['2026-02-22'];
    const result = computeStreaks(dates, '2026-02-22');
    expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak);
  });

  it('longestStreak=7 for a full week of consecutive days', () => {
    const dates = [
      '2026-02-16',
      '2026-02-17',
      '2026-02-18',
      '2026-02-19',
      '2026-02-20',
      '2026-02-21',
      '2026-02-22',
    ];
    const result = computeStreaks(dates, '2026-02-22');
    expect(result.currentStreak).toBe(7);
    expect(result.longestStreak).toBe(7);
  });
});

// ── ComputeStreakMetric (use case) ─────────────────────────────────────────────

describe('ComputeStreakMetric', () => {
  let metricRepo: InMemoryMetricRepository;
  let queryService: InMemoryExecutionQueryServiceStub;
  let eventPublisher: InMemoryBatchMetricsEventPublisherStub;
  let useCase: ComputeStreakMetric;

  const COMPUTE_DATE = '2026-02-23'; // "today" for tests

  beforeEach(() => {
    metricRepo = new InMemoryMetricRepository();
    queryService = new InMemoryExecutionQueryServiceStub();
    eventPublisher = new InMemoryBatchMetricsEventPublisherStub();
    useCase = new ComputeStreakMetric(metricRepo, queryService, eventPublisher);
  });

  function makeDTO(
    overrides: Partial<{ userId: string; professionalProfileId: string; computeDate: string }> = {},
  ) {
    return {
      userId: overrides.userId ?? generateId(),
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      computeDate: overrides.computeDate ?? COMPUTE_DATE,
    };
  }

  describe('execute()', () => {
    // ── Happy path ─────────────────────────────────────────────────────────

    it('creates a STREAK_DAYS Metric and publishes StreakMetricComputedEvent on success', async () => {
      const dto = makeDTO();
      queryService.activityDates = ['2026-02-21', '2026-02-22']; // yesterday relative to 2026-02-23

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      expect(metricRepo.saveCount).toBe(1);
      expect(eventPublisher.publishedStreakMetricComputed).toHaveLength(1);

      const saved = metricRepo.items[0]!;
      expect(saved.metricType).toBe(MetricType.STREAK_DAYS);
      expect(saved.unit).toBe('day');
      expect(saved.derivationRuleVersion).toBe('v1');
      expect(saved.value).toBe(2); // currentStreak
    });

    it('returns currentStreak, longestStreak, and status in output DTO', async () => {
      const dto = makeDTO();
      queryService.activityDates = ['2026-02-22']; // yesterday only

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.currentStreak).toBe(1);
        expect(result.value.longestStreak).toBeGreaterThanOrEqual(1);
        expect(result.value.streakStatus).toBe('ACTIVE');
        expect(result.value.metricId).toBeDefined();
      }
    });

    it('returns NEVER_STARTED status when no activity dates', async () => {
      const dto = makeDTO();
      queryService.activityDates = [];

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.currentStreak).toBe(0);
        expect(result.value.streakStatus).toBe('NEVER_STARTED');
      }
    });

    it('returns BROKEN status when last activity was before yesterday', async () => {
      const dto = makeDTO();
      queryService.activityDates = ['2026-02-18', '2026-02-19']; // 3+ days before yesterday (2026-02-22)

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.currentStreak).toBe(0);
        expect(result.value.streakStatus).toBe('BROKEN');
      }
    });

    it('defaults to today UTC when computeDate is not provided', async () => {
      const dto = {
        userId: generateId(),
        professionalProfileId: generateId(),
      };
      queryService.activityDates = [];

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
    });

    // ── StreakBrokenEvent ──────────────────────────────────────────────────

    it('publishes StreakBrokenEvent when previous streak was >0 and current is 0', async () => {
      const userId = generateId();
      const professionalProfileId = generateId();

      // Seed a previous streak metric with value=5
      const logDayResult = LogicalDay.create('2026-02-21');
      if (logDayResult.isLeft()) throw new Error('setup: bad date');
      const prevMetricResult = Metric.create({
        clientId: userId,
        professionalProfileId,
        metricType: MetricType.STREAK_DAYS,
        value: 5,
        unit: 'day',
        derivationRuleVersion: 'v1',
        sourceExecutionIds: [generateId()],
        computedAtUtc: UTCDateTime.now(),
        logicalDay: logDayResult.value,
        timezoneUsed: 'UTC',
      });
      if (prevMetricResult.isLeft()) throw new Error('setup failed');
      metricRepo.items.push(prevMetricResult.value);

      // Current: no activity (streak = 0)
      queryService.activityDates = [];

      const result = await useCase.execute({
        userId,
        professionalProfileId,
        computeDate: COMPUTE_DATE,
      });

      expect(result.isRight()).toBe(true);
      expect(eventPublisher.publishedStreakBroken).toHaveLength(1);
      expect(eventPublisher.publishedStreakBroken[0]!.payload.previousStreak).toBe(5);
    });

    it('does NOT publish StreakBrokenEvent when previous streak was already 0', async () => {
      queryService.activityDates = [];
      await useCase.execute(makeDTO());

      expect(eventPublisher.publishedStreakBroken).toHaveLength(0);
    });

    // ── NewLongestStreakEvent ──────────────────────────────────────────────

    it('publishes NewLongestStreakEvent when new longest streak exceeds previous', async () => {
      const dto = makeDTO();
      // 5 consecutive days ending yesterday
      queryService.activityDates = [
        '2026-02-18',
        '2026-02-19',
        '2026-02-20',
        '2026-02-21',
        '2026-02-22',
      ];
      // No previous streak stored (previousLongestStreak = 0)

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      expect(eventPublisher.publishedNewLongestStreak).toHaveLength(1);
      expect(eventPublisher.publishedNewLongestStreak[0]!.payload.longestStreak).toBe(5);
    });

    it('does NOT publish NewLongestStreakEvent when streak did not improve', async () => {
      const dto = makeDTO();
      queryService.activityDates = []; // 0 streak — no improvement

      await useCase.execute(dto);

      expect(eventPublisher.publishedNewLongestStreak).toHaveLength(0);
    });

    // ── Validation errors ──────────────────────────────────────────────────

    it('returns Left when userId is not a valid UUIDv4', async () => {
      const result = await useCase.execute(makeDTO({ userId: 'bad-id' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.COMPUTATION_FAILED);
      }
      expect(metricRepo.saveCount).toBe(0);
    });

    it('returns Left when professionalProfileId is not a valid UUIDv4', async () => {
      const result = await useCase.execute(makeDTO({ professionalProfileId: 'bad-id' }));

      expect(result.isLeft()).toBe(true);
    });

    it('returns Left when computeDate format is invalid', async () => {
      const result = await useCase.execute(makeDTO({ computeDate: '20260223' }));

      expect(result.isLeft()).toBe(true);
    });

    it('does not persist or publish on validation failure', async () => {
      await useCase.execute(makeDTO({ userId: 'invalid' }));

      expect(metricRepo.saveCount).toBe(0);
      expect(eventPublisher.publishedStreakMetricComputed).toHaveLength(0);
    });

    // ── Event content ──────────────────────────────────────────────────────

    it('StreakMetricComputedEvent has correct eventType and payload', async () => {
      const dto = makeDTO();
      queryService.activityDates = ['2026-02-22'];

      await useCase.execute(dto);

      const event = eventPublisher.publishedStreakMetricComputed[0]!;
      expect(event.eventType).toBe('StreakMetricComputed');
      expect(event.aggregateType).toBe('Metric');
      expect(event.payload.clientId).toBe(dto.userId);
      expect(event.payload.derivationRuleVersion).toBe('v1');
    });
  });
});
