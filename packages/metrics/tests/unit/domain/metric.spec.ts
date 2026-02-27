import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { Metric } from '../../../domain/aggregates/metric.js';
import { MetricType } from '../../../domain/enums/metric-type.js';
import { MetricErrorCodes } from '../../../domain/errors/metric-error-codes.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLogicalDay(iso = '2026-02-22'): LogicalDay {
  const result = LogicalDay.create(iso);
  if (result.isLeft()) throw new Error(`test helper: invalid logicalDay ${iso}`);
  return result.value;
}

function makeUTCDateTime(iso = '2026-02-22T10:00:00.000Z'): UTCDateTime {
  const result = UTCDateTime.fromISO(iso);
  if (result.isLeft()) throw new Error(`test helper: invalid UTCDateTime ${iso}`);
  return result.value;
}

function makeValidProps(overrides: Partial<Parameters<typeof Metric.create>[0]> = {}) {
  return {
    clientId: generateId(),
    professionalProfileId: generateId(),
    metricType: MetricType.EXECUTION_COUNT,
    value: 1,
    unit: 'session',
    derivationRuleVersion: 'v1',
    sourceExecutionIds: [generateId()],
    computedAtUtc: UTCDateTime.now(),
    logicalDay: makeLogicalDay(),
    timezoneUsed: 'America/Sao_Paulo',
    ...overrides,
  };
}

// ── Metric aggregate ──────────────────────────────────────────────────────────

describe('Metric', () => {
  let clientId: string;
  let professionalProfileId: string;
  let executionId: string;
  let logicalDay: LogicalDay;
  let computedAtUtc: UTCDateTime;

  beforeEach(() => {
    clientId = generateId();
    professionalProfileId = generateId();
    executionId = generateId();
    logicalDay = makeLogicalDay();
    computedAtUtc = makeUTCDateTime();
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('returns Right<Metric> for a valid EXECUTION_COUNT metric', () => {
      const result = Metric.create({
        clientId,
        professionalProfileId,
        metricType: MetricType.EXECUTION_COUNT,
        value: 1,
        unit: 'session',
        derivationRuleVersion: 'v1',
        sourceExecutionIds: [executionId],
        computedAtUtc,
        logicalDay,
        timezoneUsed: 'America/Sao_Paulo',
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const m = result.value;
        expect(m.clientId).toBe(clientId);
        expect(m.professionalProfileId).toBe(professionalProfileId);
        expect(m.metricType).toBe(MetricType.EXECUTION_COUNT);
        expect(m.value).toBe(1);
        expect(m.unit).toBe('session');
        expect(m.derivationRuleVersion).toBe('v1');
        expect(m.sourceExecutionIds).toEqual([executionId]);
        expect(m.computedAtUtc).toBe(computedAtUtc);
        expect(m.logicalDay).toBe(logicalDay);
        expect(m.timezoneUsed).toBe('America/Sao_Paulo');
        expect(m.version).toBe(0);
      }
    });

    it('returns Right<Metric> for WEEKLY_VOLUME with multiple sourceExecutionIds', () => {
      const e1 = generateId();
      const e2 = generateId();
      const e3 = generateId();

      const result = Metric.create(
        makeValidProps({
          metricType: MetricType.WEEKLY_VOLUME,
          value: 3,
          unit: 'session',
          sourceExecutionIds: [e1, e2, e3],
        }),
      );

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.metricType).toBe(MetricType.WEEKLY_VOLUME);
        expect(result.value.value).toBe(3);
        expect(result.value.sourceExecutionIds).toEqual([e1, e2, e3]);
      }
    });

    it('returns Right<Metric> for STREAK_DAYS metric', () => {
      const result = Metric.create(
        makeValidProps({
          metricType: MetricType.STREAK_DAYS,
          value: 7,
          unit: 'day',
        }),
      );

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.metricType).toBe(MetricType.STREAK_DAYS);
        expect(result.value.value).toBe(7);
        expect(result.value.unit).toBe('day');
      }
    });

    it('generates a UUIDv4 id when no id is provided', () => {
      const result = Metric.create(makeValidProps());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });

    it('uses an explicit id when provided', () => {
      const id = generateId();
      const result = Metric.create(makeValidProps({ id }));

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.id).toBe(id);
      }
    });

    it('accepts value=0 (boundary)', () => {
      const result = Metric.create(makeValidProps({ value: 0 }));
      expect(result.isRight()).toBe(true);
    });

    it('trims whitespace from unit', () => {
      const result = Metric.create(makeValidProps({ unit: '  session  ' }));

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.unit).toBe('session');
      }
    });

    it('trims whitespace from derivationRuleVersion', () => {
      const result = Metric.create(makeValidProps({ derivationRuleVersion: '  v1  ' }));

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.derivationRuleVersion).toBe('v1');
      }
    });

    it('trims whitespace from timezoneUsed', () => {
      const result = Metric.create(makeValidProps({ timezoneUsed: '  UTC  ' }));

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.timezoneUsed).toBe('UTC');
      }
    });

    it('sourceExecutionIds is a defensive copy (mutation of original array does not affect stored value)', () => {
      const ids = [generateId()];
      const result = Metric.create(makeValidProps({ sourceExecutionIds: ids }));

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        ids.push(generateId()); // mutate original
        expect(result.value.sourceExecutionIds).toHaveLength(1);
      }
    });

    // ── ADR-0009 §3 — aggregate does not collect domain events ───────────────

    it('does not collect domain events (application layer dispatches — ADR-0009 §3)', () => {
      const result = Metric.create(makeValidProps());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.getDomainEvents()).toHaveLength(0);
      }
    });

    // ── Invariant 1: sourceExecutionIds non-empty ────────────────────────────

    it('returns Left<InvalidMetricError> when sourceExecutionIds is empty', () => {
      const result = Metric.create(makeValidProps({ sourceExecutionIds: [] }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/sourceExecutionIds/);
      }
    });

    // ── Invariant 2: each sourceExecutionId is a valid UUIDv4 ────────────────

    it('returns Left<InvalidMetricError> when a sourceExecutionId is not a valid UUIDv4', () => {
      const result = Metric.create(makeValidProps({ sourceExecutionIds: ['not-a-uuid'] }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/invalid UUIDv4/i);
      }
    });

    it('returns Left<InvalidMetricError> when one of multiple sourceExecutionIds is invalid', () => {
      const result = Metric.create(
        makeValidProps({
          sourceExecutionIds: [generateId(), 'bad-id'],
        }),
      );

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
      }
    });

    // ── Invariant 3: value must be finite and non-negative ───────────────────

    it('returns Left<InvalidMetricError> for a negative value', () => {
      const result = Metric.create(makeValidProps({ value: -1 }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/non-negative/);
      }
    });

    it('returns Left<InvalidMetricError> for Infinity as value', () => {
      const result = Metric.create(makeValidProps({ value: Infinity }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
      }
    });

    it('returns Left<InvalidMetricError> for NaN as value', () => {
      const result = Metric.create(makeValidProps({ value: NaN }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
      }
    });

    // ── Invariant 4: unit length ─────────────────────────────────────────────

    it('returns Left<InvalidMetricError> for a unit exceeding 20 chars', () => {
      const result = Metric.create(makeValidProps({ unit: 'x'.repeat(21) }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/unit/);
      }
    });

    it('returns Left<InvalidMetricError> for a whitespace-only unit', () => {
      const result = Metric.create(makeValidProps({ unit: '   ' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
      }
    });

    // ── Invariant 5: derivationRuleVersion length ────────────────────────────

    it('returns Left<InvalidMetricError> for a derivationRuleVersion exceeding 10 chars', () => {
      const result = Metric.create(makeValidProps({ derivationRuleVersion: 'v'.repeat(11) }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/derivationRuleVersion/);
      }
    });

    it('returns Left<InvalidMetricError> for an empty derivationRuleVersion', () => {
      const result = Metric.create(makeValidProps({ derivationRuleVersion: '   ' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
      }
    });

    // ── Invariant 6: timezoneUsed non-empty ──────────────────────────────────

    it('returns Left<InvalidMetricError> for an empty timezoneUsed', () => {
      const result = Metric.create(makeValidProps({ timezoneUsed: '   ' }));

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/timezoneUsed/);
      }
    });

    // ── Invariant 7: recognized metricType ──────────────────────────────────

    it('returns Left<InvalidMetricError> for an unrecognized metricType', () => {
      const result = Metric.create(
        makeValidProps({
          metricType: 'UNKNOWN_METRIC' as MetricType,
        }),
      );

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(MetricErrorCodes.METRIC_INVALID);
        expect(result.value.message).toMatch(/metricType/);
      }
    });
  });

  // ── reconstitute() ───────────────────────────────────────────────────────

  describe('reconstitute()', () => {
    it('restores all props including version without validation', () => {
      const id = generateId();
      const e1 = generateId();
      const e2 = generateId();

      const metric = Metric.reconstitute(
        id,
        {
          clientId,
          professionalProfileId,
          metricType: MetricType.WEEKLY_VOLUME,
          value: 5,
          unit: 'session',
          derivationRuleVersion: 'v2',
          sourceExecutionIds: [e1, e2],
          computedAtUtc,
          logicalDay,
          timezoneUsed: 'UTC',
        },
        3,
      );

      expect(metric.id).toBe(id);
      expect(metric.version).toBe(3);
      expect(metric.metricType).toBe(MetricType.WEEKLY_VOLUME);
      expect(metric.value).toBe(5);
      expect(metric.unit).toBe('session');
      expect(metric.derivationRuleVersion).toBe('v2');
      expect(metric.sourceExecutionIds).toEqual([e1, e2]);
      expect(metric.computedAtUtc).toBe(computedAtUtc);
      expect(metric.logicalDay).toBe(logicalDay);
      expect(metric.timezoneUsed).toBe('UTC');
    });
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  it('exposes all getters', () => {
    const id = generateId();
    const eId = generateId();

    const result = Metric.create({
      id,
      clientId,
      professionalProfileId,
      metricType: MetricType.EXECUTION_COUNT,
      value: 1,
      unit: 'session',
      derivationRuleVersion: 'v1',
      sourceExecutionIds: [eId],
      computedAtUtc,
      logicalDay,
      timezoneUsed: 'America/Sao_Paulo',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const m = result.value;
      expect(m.id).toBe(id);
      expect(m.clientId).toBe(clientId);
      expect(m.professionalProfileId).toBe(professionalProfileId);
      expect(m.metricType).toBe(MetricType.EXECUTION_COUNT);
      expect(m.value).toBe(1);
      expect(m.unit).toBe('session');
      expect(m.derivationRuleVersion).toBe('v1');
      expect(m.sourceExecutionIds).toEqual([eId]);
      expect(m.computedAtUtc).toBe(computedAtUtc);
      expect(m.logicalDay).toBe(logicalDay);
      expect(m.timezoneUsed).toBe('America/Sao_Paulo');
    }
  });

  // ── MetricType enum ────────────────────────────────────────────────────────

  describe('MetricType enum', () => {
    it('defines EXECUTION_COUNT, WEEKLY_VOLUME, and STREAK_DAYS', () => {
      expect(MetricType.EXECUTION_COUNT).toBe('EXECUTION_COUNT');
      expect(MetricType.WEEKLY_VOLUME).toBe('WEEKLY_VOLUME');
      expect(MetricType.STREAK_DAYS).toBe('STREAK_DAYS');
    });
  });
});
