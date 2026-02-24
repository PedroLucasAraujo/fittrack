import { AggregateRoot, UTCDateTime, LogicalDay, generateId, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { MetricType } from '../enums/metric-type.js';
import type { MetricType as MetricTypeValue } from '../enums/metric-type.js';
import { InvalidMetricError } from '../errors/invalid-metric-error.js';

/** UUIDv4 regex (ADR-0047 §6). */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Maximum character length for unit label (e.g., "session", "day"). */
const UNIT_MAX_LENGTH = 20;

/** Maximum character length for derivationRuleVersion (e.g., "v1", "v2.1"). */
const DERIVATION_RULE_VERSION_MAX_LENGTH = 10;

export interface MetricProps {
  /**
   * Client to whom this metric belongs (cross-aggregate ref, ADR-0047). Immutable.
   * This is the user whose execution history was aggregated.
   */
  clientId: string;

  /**
   * Owning professional — tenant isolation key (ADR-0025). Immutable.
   * All repository queries include this as a mandatory scoping parameter.
   * Cross-tenant access returns null (404, not 403).
   */
  professionalProfileId: string;

  /**
   * Type of behavioral metric being recorded (ADR-0014 §2, ADR-0043 §1).
   * Immutable. Physiological computation is prohibited (ADR-0028 §4).
   */
  metricType: MetricTypeValue;

  /**
   * The derived numeric value (e.g., 1 for EXECUTION_COUNT, 5 for WEEKLY_VOLUME).
   * Must be finite and ≥ 0. Immutable (ADR-0014 §5).
   */
  value: number;

  /**
   * Unit of measurement (e.g., "session", "day").
   * 1–20 characters. Immutable.
   */
  unit: string;

  /**
   * Version of the derivation rule applied to produce this record (ADR-0043 §1).
   * Immutable. Rule changes produce a new Metric record with an updated version;
   * existing records are never overwritten (ADR-0043 §2).
   */
  derivationRuleVersion: string;

  /**
   * IDs of the source Execution records used in the derivation (ADR-0043 §1).
   * Non-empty. Cross-aggregate references by ID only (ADR-0047).
   * For per-execution metrics (EXECUTION_COUNT) this is a 1-element array.
   * For windowed metrics (WEEKLY_VOLUME, STREAK_DAYS) it may have many elements.
   * Immutable.
   */
  sourceExecutionIds: string[];

  /**
   * UTC instant when this Metric record was computed (ADR-0014 §2). Immutable.
   */
  computedAtUtc: UTCDateTime;

  /**
   * Calendar date anchor for this metric (ADR-0010, ADR-0014 §2). Immutable.
   * For EXECUTION_COUNT: matches the source Execution's logicalDay exactly.
   * For WEEKLY_VOLUME: ISO week start (Monday) of the derivation window.
   * For STREAK_DAYS: last active day of the streak.
   */
  logicalDay: LogicalDay;

  /**
   * IANA timezone used when computing the logicalDay (ADR-0010). Immutable.
   * Sourced from the triggering Execution's timezoneUsed field.
   */
  timezoneUsed: string;
}

/**
 * Metric aggregate root — a single immutable derived analytical value
 * (ADR-0047, Metrics bounded context).
 *
 * ## Role in the system (ADR-0014 §1)
 *
 * Metrics are derived from Execution records. They are NOT authoritative:
 * ```
 * Execution (source of truth)
 *   ↓ (one-directional derivation)
 * Metric (derived, versioned — this aggregate)
 *   ↓ (one-directional projection)
 * Read Model / Dashboard View
 * ```
 *
 * Metrics never supersede, alter, or influence Execution records (ADR-0005 §7).
 *
 * ## Immutability (ADR-0014 §5, ADR-0043 §5)
 *
 * A Metric record is immutable after creation. If the derivation rule changes,
 * a NEW Metric record is created with the new derivationRuleVersion. Old records
 * are retained (ADR-0043 §2). No `update()` or `delete()` methods exist.
 *
 * ## Behavioral scope (ADR-0028 §4)
 *
 * Only behavioral metrics are supported in MVP. Automatic physiological
 * interpretation (e.g., body-fat estimates) is prohibited without explicit
 * professional configuration.
 *
 * ## Tenant isolation (ADR-0025)
 *
 * `professionalProfileId` is immutable and non-null. All repository queries
 * include it as a mandatory scoping parameter. Cross-tenant access returns null
 * (404, not 403).
 *
 * ## LGPD / Privacy (ADR-0037, ADR-0014 §5)
 *
 * Behavioral metric records (EXECUTION_COUNT, WEEKLY_VOLUME, STREAK_DAYS) do not
 * contain PII or raw health values. On LGPD erasure, they are retained as immutable
 * aggregate facts (confirmed by user decision aligned with ADR-0014 §5 immutability
 * and ADR-0037 §6 permanent retention of Execution structure). No anonymize() method.
 *
 * ## Domain events (ADR-0009 §3)
 *
 * No events are emitted by this aggregate. Per ADR-0009 §3, the application
 * layer (DeriveExecutionMetrics use case) constructs and dispatches
 * `MetricComputedEvent` after the repository commits the aggregate.
 *
 * ## Concurrency (ADR-0006)
 *
 * Carries optimistic locking `version` via AggregateRoot base class.
 */
export class Metric extends AggregateRoot<MetricProps> {
  private constructor(id: string, props: MetricProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new immutable Metric record.
   *
   * ## Invariants enforced here
   *
   * 1. `sourceExecutionIds` must be a non-empty array.
   * 2. Every entry in `sourceExecutionIds` must be a valid UUIDv4.
   * 3. `value` must be a finite non-negative number.
   * 4. `unit` must be 1–20 characters.
   * 5. `derivationRuleVersion` must be 1–10 characters.
   * 6. `timezoneUsed` must be a non-empty string.
   * 7. `metricType` must be a recognized MetricType value.
   *
   * All temporal value objects (`computedAtUtc`, `logicalDay`) must be
   * pre-constructed by the Application layer. The factory trusts them.
   */
  static create(props: {
    id?: string;
    clientId: string;
    professionalProfileId: string;
    metricType: MetricTypeValue;
    value: number;
    unit: string;
    derivationRuleVersion: string;
    sourceExecutionIds: string[];
    computedAtUtc: UTCDateTime;
    logicalDay: LogicalDay;
    timezoneUsed: string;
  }): DomainResult<Metric> {
    // Invariant 1: sourceExecutionIds must be non-empty
    if (props.sourceExecutionIds.length === 0) {
      return left(
        new InvalidMetricError('sourceExecutionIds must contain at least one executionId'),
      );
    }

    // Invariant 2: each sourceExecutionId must be a valid UUIDv4
    for (const execId of props.sourceExecutionIds) {
      if (!UUID_V4_REGEX.test(execId)) {
        return left(
          new InvalidMetricError(`sourceExecutionIds contains an invalid UUIDv4: "${execId}"`),
        );
      }
    }

    // Invariant 3: value must be finite and non-negative
    if (!Number.isFinite(props.value) || props.value < 0) {
      return left(new InvalidMetricError('value must be a finite non-negative number'));
    }

    // Invariant 4: unit length
    const unit = props.unit.trim();
    if (unit.length < 1 || unit.length > UNIT_MAX_LENGTH) {
      return left(new InvalidMetricError(`unit must be 1–${UNIT_MAX_LENGTH} characters`));
    }

    // Invariant 5: derivationRuleVersion length
    const derivationRuleVersion = props.derivationRuleVersion.trim();
    if (
      derivationRuleVersion.length < 1 ||
      derivationRuleVersion.length > DERIVATION_RULE_VERSION_MAX_LENGTH
    ) {
      return left(
        new InvalidMetricError(
          `derivationRuleVersion must be 1–${DERIVATION_RULE_VERSION_MAX_LENGTH} characters`,
        ),
      );
    }

    // Invariant 6: timezoneUsed must be non-empty
    if (props.timezoneUsed.trim().length === 0) {
      return left(new InvalidMetricError('timezoneUsed must be a non-empty string'));
    }

    // Invariant 7: metricType must be a recognized value
    const validTypes: string[] = Object.values(MetricType);
    if (!validTypes.includes(props.metricType)) {
      return left(
        new InvalidMetricError(`metricType "${props.metricType}" is not a recognized MetricType`),
      );
    }

    const id = props.id ?? generateId();

    const metric = new Metric(
      id,
      {
        clientId: props.clientId,
        professionalProfileId: props.professionalProfileId,
        metricType: props.metricType,
        value: props.value,
        unit,
        derivationRuleVersion,
        sourceExecutionIds: [...props.sourceExecutionIds],
        computedAtUtc: props.computedAtUtc,
        logicalDay: props.logicalDay,
        timezoneUsed: props.timezoneUsed.trim(),
      },
      0,
    );

    return right(metric);
  }

  /**
   * Reconstitutes a Metric from persisted storage.
   * No validation is performed — trusts the data integrity of the repository.
   */
  static reconstitute(id: string, props: MetricProps, version: number): Metric {
    return new Metric(id, props, version);
  }

  // ── Getters ──────────────────────────────────────────────────────────────────

  get clientId(): string {
    return this.props.clientId;
  }

  get professionalProfileId(): string {
    return this.props.professionalProfileId;
  }

  get metricType(): MetricTypeValue {
    return this.props.metricType;
  }

  get value(): number {
    return this.props.value;
  }

  get unit(): string {
    return this.props.unit;
  }

  get derivationRuleVersion(): string {
    return this.props.derivationRuleVersion;
  }

  get sourceExecutionIds(): readonly string[] {
    return this.props.sourceExecutionIds;
  }

  get computedAtUtc(): UTCDateTime {
    return this.props.computedAtUtc;
  }

  get logicalDay(): LogicalDay {
    return this.props.logicalDay;
  }

  get timezoneUsed(): string {
    return this.props.timezoneUsed;
  }
}
