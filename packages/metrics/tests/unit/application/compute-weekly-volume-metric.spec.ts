import { describe, it, expect, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ComputeWeeklyVolumeMetric } from '../../../application/use-cases/compute-weekly-volume-metric.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { InMemoryMetricRepository } from '../../repositories/in-memory-metric-repository.js';
import { InMemoryExecutionQueryServiceStub } from '../../stubs/in-memory-execution-query-service-stub.js';
import { InMemoryBatchMetricsEventPublisherStub } from '../../stubs/in-memory-batch-metrics-event-publisher-stub.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Monday 2026-02-16 is a known Monday. */
const A_MONDAY = '2026-02-16';
/** Not a Monday (Wednesday). */
const NOT_A_MONDAY = '2026-02-18';

function makeDTO(
  overrides: Partial<{ userId: string; professionalProfileId: string; weekStartDate: string }> = {},
) {
  return {
    userId: overrides.userId ?? generateId(),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    weekStartDate: overrides.weekStartDate ?? A_MONDAY,
  };
}

// ── ComputeWeeklyVolumeMetric ─────────────────────────────────────────────────

describe('ComputeWeeklyVolumeMetric', () => {
  let metricRepo: InMemoryMetricRepository;
  let queryService: InMemoryExecutionQueryServiceStub;
  let eventPublisher: InMemoryBatchMetricsEventPublisherStub;
  let useCase: ComputeWeeklyVolumeMetric;

  beforeEach(() => {
    metricRepo = new InMemoryMetricRepository();
    queryService = new InMemoryExecutionQueryServiceStub();
    eventPublisher = new InMemoryBatchMetricsEventPublisherStub();
    useCase = new ComputeWeeklyVolumeMetric(metricRepo, queryService, eventPublisher);
  });

  describe('execute()', () => {
    // ── Happy path ───────────────────────────────────────────────────────────

    it('creates a WEEKLY_VOLUME Metric and publishes event on success', async () => {
      const dto = makeDTO();
      queryService.setupWeekWithWorkouts(3, 1000);

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      expect(metricRepo.saveCount).toBe(1);
      expect(eventPublisher.publishedWeeklyVolumeMetricComputed).toHaveLength(1);

      const saved = metricRepo.items[0]!;
      expect(saved.metricType).toBe(MetricType.WEEKLY_VOLUME);
      expect(saved.value).toBe(3000); // 3 * 1000
      expect(saved.unit).toBe('session');
      expect(saved.derivationRuleVersion).toBe('v1');
      expect(saved.clientId).toBe(dto.userId);
    });

    it('returns the metricId and workoutCount in the output DTO', async () => {
      const dto = makeDTO();
      queryService.setupWeekWithWorkouts(5, 500);

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.metricId).toBeDefined();
        expect(result.value.workoutCount).toBe(5);
        expect(result.value.totalVolume).toBe(2500);
      }
    });

    it('computes totalVolume as rounded integer (ADR-0004)', async () => {
      const dto = makeDTO();
      queryService.weeklyExecutionSummary = {
        workoutCount: 1,
        totalVolume: 100.7,
        totalSets: 3,
        uniqueExercises: 2,
        sourceExecutionIds: [generateId()],
      };

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.totalVolume).toBe(101); // rounded
      }
    });

    it('sets logicalDay to weekStartDate (anchor = Monday, ADR-0010)', async () => {
      const dto = makeDTO();
      queryService.setupWeekWithWorkouts(1);

      await useCase.execute(dto);

      const saved = metricRepo.items[0]!;
      expect(saved.logicalDay.value).toBe(A_MONDAY);
    });

    it('publishes event with correct weekStartDate and weekEndDate', async () => {
      const dto = makeDTO({ weekStartDate: A_MONDAY });
      queryService.setupWeekWithWorkouts(2);

      await useCase.execute(dto);

      const event = eventPublisher.publishedWeeklyVolumeMetricComputed[0]!;
      expect(event.payload.weekStartDate).toBe(A_MONDAY);
      expect(event.payload.weekEndDate).toBe('2026-02-22'); // Sunday 6 days later
    });

    it('handles zero-workout week with sentinel sourceExecutionId', async () => {
      const dto = makeDTO();
      // Default stub: workoutCount=0, sourceExecutionIds=[]

      const result = await useCase.execute(dto);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.workoutCount).toBe(0);
        expect(result.value.totalVolume).toBe(0);
      }
      expect(metricRepo.saveCount).toBe(1);
    });

    it('is idempotent: saves a new metric even if one exists for the same week', async () => {
      const dto = makeDTO();
      queryService.setupWeekWithWorkouts(2);

      await useCase.execute(dto);
      await useCase.execute(dto); // run again

      // Per ADR-0043 §2: new record is created; old is NOT overwritten
      expect(metricRepo.saveCount).toBe(2);
    });

    // ── Validation errors ────────────────────────────────────────────────────

    it('returns Left when userId is not a valid UUIDv4', async () => {
      const result = await useCase.execute(makeDTO({ userId: 'not-a-uuid' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.COMPUTATION_FAILED);
      }
      expect(metricRepo.saveCount).toBe(0);
      expect(eventPublisher.publishedWeeklyVolumeMetricComputed).toHaveLength(0);
    });

    it('returns Left when professionalProfileId is not a valid UUIDv4', async () => {
      const result = await useCase.execute(makeDTO({ professionalProfileId: 'bad-id' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.COMPUTATION_FAILED);
      }
    });

    it('returns Left when weekStartDate format is invalid', async () => {
      const result = await useCase.execute(makeDTO({ weekStartDate: '2026/02/16' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.INVALID_WEEK_START_DATE);
      }
    });

    it('returns Left when weekStartDate is not a Monday', async () => {
      const result = await useCase.execute(makeDTO({ weekStartDate: NOT_A_MONDAY }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.INVALID_WEEK_START_DATE);
        expect(result.value.message).toMatch(/Monday/i);
      }
    });

    it('returns Left when weekStartDate is an invalid date string', async () => {
      const result = await useCase.execute(makeDTO({ weekStartDate: '2026-99-99' }));

      expect(result.isLeft()).toBe(true);
    });

    // ── Event content ────────────────────────────────────────────────────────

    it('published event has correct eventType and aggregateType', async () => {
      await useCase.execute(makeDTO());

      const event = eventPublisher.publishedWeeklyVolumeMetricComputed[0]!;
      expect(event.eventType).toBe('WeeklyVolumeMetricComputed');
      expect(event.aggregateType).toBe('Metric');
    });

    it('published event payload includes clientId and professionalProfileId', async () => {
      const dto = makeDTO();

      await useCase.execute(dto);

      const event = eventPublisher.publishedWeeklyVolumeMetricComputed[0]!;
      expect(event.payload.clientId).toBe(dto.userId);
      expect(event.payload.professionalProfileId).toBe(dto.professionalProfileId);
    });

    it('does not persist or publish when validation fails', async () => {
      await useCase.execute(makeDTO({ userId: 'invalid' }));

      expect(metricRepo.saveCount).toBe(0);
      expect(eventPublisher.publishedWeeklyVolumeMetricComputed).toHaveLength(0);
    });
  });
});
