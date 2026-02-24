import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateId } from '@fittrack/core';
import { ExecutionRecordedEvent } from '@fittrack/execution';
import { DeriveExecutionMetrics } from '../../../application/use-cases/derive-execution-metrics.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import type { IMetricRepository } from '../../../domain/repositories/metric-repository.js';
import type { IMetricsEventPublisher } from '../../../application/ports/metrics-event-publisher-port.js';
import type { MetricComputedEvent } from '../../../domain/events/metric-computed-event.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExecutionRecordedEvent(
  overrides: Partial<{
    executionId: string;
    clientId: string;
    professionalProfileId: string;
    deliverableId: string;
    logicalDay: string;
    status: string;
    occurredAtUtc: string;
    timezoneUsed: string;
  }> = {},
): ExecutionRecordedEvent {
  return new ExecutionRecordedEvent(
    overrides.executionId ?? generateId(),
    overrides.professionalProfileId ?? generateId(),
    {
      executionId: overrides.executionId ?? generateId(),
      clientId: overrides.clientId ?? generateId(),
      professionalProfileId: overrides.professionalProfileId ?? generateId(),
      deliverableId: overrides.deliverableId ?? generateId(),
      logicalDay: overrides.logicalDay ?? '2026-02-22',
      status: overrides.status ?? 'CONFIRMED',
      occurredAtUtc: overrides.occurredAtUtc ?? '2026-02-22T10:00:00.000Z',
      timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
    },
  );
}

function makeMetricRepo(overrides: Partial<IMetricRepository> = {}): IMetricRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findBySourceExecutionIdAndType: vi.fn().mockResolvedValue(null),
    findByClientAndLogicalDay: vi.fn().mockResolvedValue([]),
    findByClientAndDateRange: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeEventPublisher(
  overrides: Partial<IMetricsEventPublisher> = {},
): IMetricsEventPublisher {
  return {
    publishMetricComputed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── DeriveExecutionMetrics ────────────────────────────────────────────────────

describe('DeriveExecutionMetrics', () => {
  let metricRepo: IMetricRepository;
  let eventPublisher: IMetricsEventPublisher;
  let useCase: DeriveExecutionMetrics;

  beforeEach(() => {
    metricRepo = makeMetricRepo();
    eventPublisher = makeEventPublisher();
    useCase = new DeriveExecutionMetrics(metricRepo, eventPublisher);
  });

  describe('execute()', () => {
    it('creates an EXECUTION_COUNT Metric and publishes MetricComputedEvent on success', async () => {
      const executionId = generateId();
      const clientId = generateId();
      const professionalProfileId = generateId();
      const event = makeExecutionRecordedEvent({
        executionId,
        clientId,
        professionalProfileId,
        logicalDay: '2026-02-22',
        timezoneUsed: 'America/Sao_Paulo',
      });

      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(metricRepo.save).toHaveBeenCalledOnce();
      expect(eventPublisher.publishMetricComputed).toHaveBeenCalledOnce();

      const publishedEvent = (eventPublisher.publishMetricComputed as ReturnType<typeof vi.fn>).mock
        .calls[0]?.[0] as MetricComputedEvent;

      expect(publishedEvent.eventType).toBe('MetricComputed');
      expect(publishedEvent.aggregateType).toBe('Metric');
      expect(publishedEvent.payload.clientId).toBe(clientId);
      expect(publishedEvent.payload.professionalProfileId).toBe(professionalProfileId);
      expect(publishedEvent.payload.metricType).toBe(MetricType.EXECUTION_COUNT);
      expect(publishedEvent.payload.logicalDay).toBe('2026-02-22');
      expect(publishedEvent.payload.derivationRuleVersion).toBe('v1');
    });

    it('creates a Metric with value=1 and unit="session" (EXECUTION_COUNT invariant)', async () => {
      const event = makeExecutionRecordedEvent();

      await useCase.execute(event);

      const savedMetric = (metricRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(savedMetric.value).toBe(1);
      expect(savedMetric.unit).toBe('session');
    });

    it('creates a Metric with sourceExecutionIds containing the execution id', async () => {
      const executionId = generateId();
      const event = makeExecutionRecordedEvent({ executionId });

      await useCase.execute(event);

      const savedMetric = (metricRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(savedMetric.sourceExecutionIds).toEqual([executionId]);
    });

    it('creates a Metric with logicalDay matching the event payload (ADR-0010, ADR-0014)', async () => {
      const event = makeExecutionRecordedEvent({ logicalDay: '2026-01-15' });

      await useCase.execute(event);

      const savedMetric = (metricRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(savedMetric.logicalDay.value).toBe('2026-01-15');
    });

    it('creates a Metric with derivationRuleVersion="v1" (ADR-0043)', async () => {
      const event = makeExecutionRecordedEvent();

      await useCase.execute(event);

      const savedMetric = (metricRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(savedMetric.derivationRuleVersion).toBe('v1');
    });

    // ── Idempotency (ADR-0007) ────────────────────────────────────────────────

    it('returns Right(undefined) without saving when an EXECUTION_COUNT metric already exists (idempotency)', async () => {
      const existingMetric = { id: generateId() }; // minimal stub
      metricRepo = makeMetricRepo({
        findBySourceExecutionIdAndType: vi.fn().mockResolvedValue(existingMetric),
      });
      useCase = new DeriveExecutionMetrics(metricRepo, eventPublisher);

      const event = makeExecutionRecordedEvent();
      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(metricRepo.save).not.toHaveBeenCalled();
      expect(eventPublisher.publishMetricComputed).not.toHaveBeenCalled();
    });

    it('queries the repository for idempotency with the correct executionId and type', async () => {
      const executionId = generateId();
      const professionalProfileId = generateId();
      const event = makeExecutionRecordedEvent({ executionId, professionalProfileId });

      await useCase.execute(event);

      expect(metricRepo.findBySourceExecutionIdAndType).toHaveBeenCalledWith(
        executionId,
        MetricType.EXECUTION_COUNT,
        professionalProfileId,
      );
    });

    // ── Invalid temporal fields ───────────────────────────────────────────────

    it('returns Left<InvalidMetricError> when logicalDay in event payload is malformed', async () => {
      const event = makeExecutionRecordedEvent({ logicalDay: 'not-a-date' });

      const result = await useCase.execute(event);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.INVALID_METRIC);
        expect(result.value.message).toMatch(/logicalDay/);
      }
      expect(metricRepo.save).not.toHaveBeenCalled();
      expect(eventPublisher.publishMetricComputed).not.toHaveBeenCalled();
    });
  });
});
