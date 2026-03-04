import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { ExecutionRecordedEvent } from '@fittrack/execution';
import { Metric } from '../../../domain/aggregates/metric.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';
import { DeriveExecutionMetrics } from '../../../application/use-cases/derive-execution-metrics.js';
import { InMemoryMetricRepository } from '../../repositories/in-memory-metric-repository.js';
import { InMemoryMetricsEventPublisherStub } from '../../stubs/in-memory-metrics-event-publisher-stub.js';

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
  const executionId = overrides.executionId ?? generateId();
  const professionalProfileId = overrides.professionalProfileId ?? generateId();
  return new ExecutionRecordedEvent(executionId, professionalProfileId, {
    executionId,
    clientId: overrides.clientId ?? generateId(),
    professionalProfileId,
    deliverableId: overrides.deliverableId ?? generateId(),
    logicalDay: overrides.logicalDay ?? '2026-02-22',
    status: overrides.status ?? 'CONFIRMED',
    occurredAtUtc: overrides.occurredAtUtc ?? '2026-02-22T10:00:00.000Z',
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
  });
}

function makeMetric(executionId: string, professionalProfileId: string): Metric {
  const logicalDayResult = LogicalDay.create('2026-02-22');
  if (logicalDayResult.isLeft()) throw new Error('test helper: invalid logicalDay');
  const result = Metric.create({
    clientId: generateId(),
    professionalProfileId,
    metricType: MetricType.EXECUTION_COUNT,
    value: 1,
    unit: 'session',
    derivationRuleVersion: 'v1',
    sourceExecutionIds: [executionId],
    computedAtUtc: UTCDateTime.now(),
    logicalDay: logicalDayResult.value,
    timezoneUsed: 'America/Sao_Paulo',
  });
  if (result.isLeft()) throw new Error('test helper: Metric.create failed');
  return result.value;
}

// ── DeriveExecutionMetrics ────────────────────────────────────────────────────

describe('DeriveExecutionMetrics', () => {
  let metricRepo: InMemoryMetricRepository;
  let eventPublisher: InMemoryMetricsEventPublisherStub;
  let useCase: DeriveExecutionMetrics;

  beforeEach(() => {
    metricRepo = new InMemoryMetricRepository();
    eventPublisher = new InMemoryMetricsEventPublisherStub();
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
      expect(metricRepo.saveCount).toBe(1);
      expect(eventPublisher.publishedMetricComputed).toHaveLength(1);

      const published = eventPublisher.publishedMetricComputed[0];
      expect(published).toBeDefined();
      if (!published) throw new Error('expected published event');
      expect(published.eventType).toBe('MetricComputed');
      expect(published.aggregateType).toBe('Metric');
      expect(published.payload.clientId).toBe(clientId);
      expect(published.payload.professionalProfileId).toBe(professionalProfileId);
      expect(published.payload.metricType).toBe(MetricType.EXECUTION_COUNT);
      expect(published.payload.logicalDay).toBe('2026-02-22');
      expect(published.payload.derivationRuleVersion).toBe('v1');
    });

    it('creates a Metric with value=1 and unit="session" (EXECUTION_COUNT invariant)', async () => {
      const event = makeExecutionRecordedEvent();

      await useCase.execute(event);

      const saved = metricRepo.items[0];
      if (!saved) throw new Error('expected saved metric');
      expect(saved.value).toBe(1);
      expect(saved.unit).toBe('session');
    });

    it('creates a Metric with sourceExecutionIds containing the execution id', async () => {
      const executionId = generateId();
      const event = makeExecutionRecordedEvent({ executionId });

      await useCase.execute(event);

      const item0 = metricRepo.items[0];
      if (!item0) throw new Error('expected metric');
      expect(item0.sourceExecutionIds).toEqual([executionId]);
    });

    it('creates a Metric with logicalDay matching the event payload (ADR-0010, ADR-0014)', async () => {
      const event = makeExecutionRecordedEvent({ logicalDay: '2026-01-15' });

      await useCase.execute(event);

      const item0b = metricRepo.items[0];
      if (!item0b) throw new Error('expected metric');
      expect(item0b.logicalDay.value).toBe('2026-01-15');
    });

    it('creates a Metric with derivationRuleVersion="v1" (ADR-0043)', async () => {
      const event = makeExecutionRecordedEvent();

      await useCase.execute(event);

      const item0c = metricRepo.items[0];
      if (!item0c) throw new Error('expected metric');
      expect(item0c.derivationRuleVersion).toBe('v1');
    });

    // ── Idempotency (ADR-0007) ────────────────────────────────────────────────

    it('returns Right(undefined) without saving when an EXECUTION_COUNT metric already exists (idempotency)', async () => {
      const executionId = generateId();
      const professionalProfileId = generateId();
      metricRepo.items.push(makeMetric(executionId, professionalProfileId));

      const event = makeExecutionRecordedEvent({ executionId, professionalProfileId });
      const result = await useCase.execute(event);

      expect(result.isRight()).toBe(true);
      expect(metricRepo.saveCount).toBe(0);
      expect(eventPublisher.publishedMetricComputed).toHaveLength(0);
    });

    it('idempotency guard is scoped to executionId and professionalProfileId — different tenant creates a new metric', async () => {
      const executionId = generateId();
      const tenantA = generateId();
      const tenantB = generateId();

      // Pre-populate repo for tenant A
      metricRepo.items.push(makeMetric(executionId, tenantA));

      // Execute for tenant B with the same executionId
      const event = makeExecutionRecordedEvent({ executionId, professionalProfileId: tenantB });
      const result = await useCase.execute(event);

      // Tenant B should get a new metric — idempotency guard must not cross tenant boundary
      expect(result.isRight()).toBe(true);
      expect(metricRepo.saveCount).toBe(1);
      expect(eventPublisher.publishedMetricComputed).toHaveLength(1);
    });

    // ── Invalid temporal fields ───────────────────────────────────────────────

    it('returns Left<InvalidMetricError> when logicalDay in event payload is malformed', async () => {
      const event = makeExecutionRecordedEvent({ logicalDay: 'not-a-date' });

      const result = await useCase.execute(event);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/logicalDay/);
      }
      expect(metricRepo.saveCount).toBe(0);
      expect(eventPublisher.publishedMetricComputed).toHaveLength(0);
    });
  });
});
