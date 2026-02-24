import { UTCDateTime, LogicalDay, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import type { ExecutionRecordedEvent } from '@fittrack/execution';
import { Metric } from '../../domain/aggregates/metric.js';
import { MetricType } from '../../domain/enums/metric-type.js';
import { MetricComputedEvent } from '../../domain/events/metric-computed-event.js';
import { InvalidMetricError } from '../../domain/errors/invalid-metric-error.js';
import type { IMetricRepository } from '../../domain/repositories/metric-repository.js';
import type { IMetricsEventPublisher } from '../ports/metrics-event-publisher-port.js';

/**
 * Derives an `EXECUTION_COUNT` Metric record from a confirmed Execution.
 *
 * Triggered by the `ExecutionRecorded` domain event via an event-driven handler
 * (ADR-0016 eventual consistency — ≤15 min target, ≤1 hour SLA for metric derivation).
 *
 * ## What this use case produces (MVP scope)
 *
 * One `EXECUTION_COUNT` Metric record per confirmed Execution:
 * - value: 1 (this Execution contributed one session)
 * - unit: 'session'
 * - sourceExecutionIds: [executionId]
 * - logicalDay: matches the source Execution's logicalDay (ADR-0010, ADR-0014 §2)
 * - derivationRuleVersion: 'v1'
 *
 * `WEEKLY_VOLUME` and `STREAK_DAYS` require multi-execution aggregation and are
 * derived via post-MVP batch jobs (ADR-0043 §3 — explicit administratively triggered).
 *
 * ## Idempotency (ADR-0007)
 *
 * Before creating a Metric, checks whether an EXECUTION_COUNT metric already
 * exists for the given executionId. If so, returns `right(undefined)` without
 * side effects. This guards against duplicate derivation on at-least-once
 * event delivery (ADR-0016 §1).
 *
 * ## Consistency boundary (ADR-0003)
 *
 * This handler executes in its own transaction scope — separate from the
 * Execution creation transaction. Metric and Execution are independent
 * aggregates (ADR-0047).
 *
 * ## Non-authoritative (ADR-0005 §7, ADR-0014 §1)
 *
 * The derived Metric reflects Execution data but never supersedes or alters
 * the Execution record. Correction recomputation is handled by an explicit
 * admin batch job (ADR-0043 §3) — not by this event handler.
 *
 * ## Behavioral scope (ADR-0028 §4)
 *
 * EXECUTION_COUNT is a behavioral metric. No physiological data is computed
 * or stored in this handler.
 */
export class DeriveExecutionMetrics {
  constructor(
    private readonly metricRepo: IMetricRepository,
    private readonly eventPublisher: IMetricsEventPublisher,
  ) {}

  async execute(event: ExecutionRecordedEvent): Promise<DomainResult<void>> {
    // 1. Idempotency guard (ADR-0007): skip if EXECUTION_COUNT already derived
    const existing = await this.metricRepo.findBySourceExecutionIdAndType(
      event.payload.executionId,
      MetricType.EXECUTION_COUNT,
      event.payload.professionalProfileId,
    );
    if (existing !== null) return right(undefined);

    // 2. Parse temporal fields from the event payload (ADR-0010)
    const logicalDayResult = LogicalDay.create(event.payload.logicalDay);
    if (logicalDayResult.isLeft()) {
      return left(
        new InvalidMetricError('ExecutionRecordedEvent.payload.logicalDay is invalid', {
          raw: event.payload.logicalDay,
        }),
      );
    }

    const computedAtUtc = UTCDateTime.now();

    // 3. Create EXECUTION_COUNT Metric aggregate (1 per confirmed Execution)
    const metricResult = Metric.create({
      clientId: event.payload.clientId,
      professionalProfileId: event.payload.professionalProfileId,
      metricType: MetricType.EXECUTION_COUNT,
      value: 1,
      unit: 'session',
      derivationRuleVersion: 'v1',
      sourceExecutionIds: [event.payload.executionId],
      computedAtUtc,
      logicalDay: logicalDayResult.value,
      timezoneUsed: event.payload.timezoneUsed,
    });

    /* c8 ignore next — defensive: create() only fails on value/unit/derivationRuleVersion/timezoneUsed invariants; all are hardcoded constants in this handler */
    if (metricResult.isLeft()) return left(metricResult.value);

    const metric = metricResult.value;

    // 4. Persist (ADR-0003 — single aggregate per transaction)
    await this.metricRepo.save(metric);

    // 5. Construct and publish MetricComputedEvent post-commit (ADR-0009 §4)
    const metricEvent = new MetricComputedEvent(metric.id, metric.professionalProfileId, {
      metricId: metric.id,
      clientId: metric.clientId,
      professionalProfileId: metric.professionalProfileId,
      metricType: metric.metricType,
      logicalDay: metric.logicalDay.value,
      derivationRuleVersion: metric.derivationRuleVersion,
    });
    await this.eventPublisher.publishMetricComputed(metricEvent);

    return right(undefined);
  }
}
