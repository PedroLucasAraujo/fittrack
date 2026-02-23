import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { Execution } from '../../domain/aggregates/execution.js';
import { ExecutionCorrection } from '../../domain/entities/execution-correction.js';
import { ExecutionStatus } from '../../domain/value-objects/execution-status.js';
import type { ExecutionProps } from '../../domain/aggregates/execution.js';
import type { ExecutionStatus as ExecutionStatusType } from '../../domain/value-objects/execution-status.js';

type ExecutionOverrides = Partial<{
  id: string;
  professionalProfileId: string;
  clientId: string;
  accessGrantId: string;
  deliverableId: string;
  occurredAtUtc: UTCDateTime;
  logicalDay: LogicalDay;
  timezoneUsed: string;
  createdAtUtc: UTCDateTime;
  /** Defaults to CONFIRMED — reconstitute() represents already-persisted Executions. */
  status: ExecutionStatusType;
  corrections: ExecutionCorrection[];
  version: number;
}>;

/**
 * Test factory for Execution — uses `reconstitute` to bypass use-case validation.
 *
 * Defaults to a minimal valid Execution with no corrections,
 * occurred at 2026-02-22T10:00:00.000Z in America/Sao_Paulo.
 */
export function makeExecution(overrides: ExecutionOverrides = {}): Execution {
  const logicalDay =
    overrides.logicalDay ??
    (() => {
      const result = LogicalDay.create('2026-02-22');
      if (result.isLeft()) throw new Error('makeExecution: invalid default logicalDay');
      return result.value;
    })();

  const props: ExecutionProps = {
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    clientId: overrides.clientId ?? generateId(),
    accessGrantId: overrides.accessGrantId ?? generateId(),
    deliverableId: overrides.deliverableId ?? generateId(),
    occurredAtUtc: overrides.occurredAtUtc ?? UTCDateTime.now(),
    logicalDay,
    timezoneUsed: overrides.timezoneUsed ?? 'America/Sao_Paulo',
    createdAtUtc: overrides.createdAtUtc ?? UTCDateTime.now(),
    status: overrides.status ?? ExecutionStatus.CONFIRMED,
    corrections: overrides.corrections ?? [],
  };

  return Execution.reconstitute(overrides.id ?? generateId(), props, overrides.version ?? 0);
}

/**
 * Creates an Execution via the domain factory (Execution.create).
 * All temporal fields are derived from the provided UTC string.
 */
export function makeNewExecution(
  overrides: Partial<{
    id: string;
    professionalProfileId: string;
    clientId: string;
    accessGrantId: string;
    deliverableId: string;
    occurredAtUtc: string;
    timezoneUsed: string;
  }> = {},
): Execution {
  const occurredAtUtcResult = UTCDateTime.fromISO(
    overrides.occurredAtUtc ?? '2026-02-22T10:00:00.000Z',
  );
  if (occurredAtUtcResult.isLeft()) {
    throw new Error(
      `makeNewExecution: invalid occurredAtUtc — ${occurredAtUtcResult.value.message}`,
    );
  }

  const tz = overrides.timezoneUsed ?? 'America/Sao_Paulo';
  const logicalDayResult = LogicalDay.fromDate(occurredAtUtcResult.value.value, tz);
  if (logicalDayResult.isLeft()) {
    throw new Error(`makeNewExecution: invalid timezoneUsed — ${logicalDayResult.value.message}`);
  }

  const result = Execution.create({
    ...(overrides.id !== undefined ? { id: overrides.id } : {}),
    professionalProfileId: overrides.professionalProfileId ?? generateId(),
    clientId: overrides.clientId ?? generateId(),
    accessGrantId: overrides.accessGrantId ?? generateId(),
    deliverableId: overrides.deliverableId ?? generateId(),
    occurredAtUtc: occurredAtUtcResult.value,
    logicalDay: logicalDayResult.value,
    timezoneUsed: tz,
    createdAtUtc: UTCDateTime.now(),
  });

  if (result.isLeft()) {
    throw new Error(`makeNewExecution: ${result.value.message}`);
  }

  return result.value;
}
