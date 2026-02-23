import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, UTCDateTime, LogicalDay } from '@fittrack/core';
import { Execution } from '../../../domain/aggregates/execution.js';
import { ExecutionCorrection } from '../../../domain/entities/execution-correction.js';
import { ExecutionErrorCodes } from '../../../domain/errors/execution-error-codes.js';
import { ExecutionStatus } from '../../../domain/value-objects/execution-status.js';
import { makeExecution, makeNewExecution } from '../../factories/make-execution.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── ExecutionCorrection subordinate entity ────────────────────────────────────

describe('ExecutionCorrection', () => {
  it('create() with explicit id uses the provided id', () => {
    const id = generateId();
    const correction = ExecutionCorrection.create(
      {
        reason: 'Wrong date recorded',
        correctedAtUtc: UTCDateTime.now(),
        correctedBy: generateId(),
      },
      id,
    );
    expect(correction.id).toBe(id);
  });

  it('create() without explicit id generates a UUIDv4', () => {
    const correction = ExecutionCorrection.create({
      reason: 'Wrong date recorded',
      correctedAtUtc: UTCDateTime.now(),
      correctedBy: generateId(),
    });
    expect(correction.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('reconstitute() preserves all props', () => {
    const id = generateId();
    const correctedAtUtc = UTCDateTime.now();
    const correctedBy = generateId();
    const correction = ExecutionCorrection.reconstitute(id, {
      reason: 'Test reason',
      correctedAtUtc,
      correctedBy,
    });

    expect(correction.id).toBe(id);
    expect(correction.reason).toBe('Test reason');
    expect(correction.correctedBy).toBe(correctedBy);
    expect(correction.correctedAtUtc).toBe(correctedAtUtc);
  });

  it('exposes all getters', () => {
    const correctedAtUtc = UTCDateTime.now();
    const correctedBy = generateId();
    const correction = ExecutionCorrection.create({
      reason: 'Client was absent',
      correctedAtUtc,
      correctedBy,
    });

    expect(correction.reason).toBe('Client was absent');
    expect(correction.correctedAtUtc).toBe(correctedAtUtc);
    expect(correction.correctedBy).toBe(correctedBy);
  });
});

// ── Execution aggregate root ──────────────────────────────────────────────────

describe('Execution', () => {
  let professionalProfileId: string;
  let clientId: string;
  let accessGrantId: string;
  let deliverableId: string;
  let occurredAtUtc: UTCDateTime;
  let logicalDay: LogicalDay;

  beforeEach(() => {
    professionalProfileId = generateId();
    clientId = generateId();
    accessGrantId = generateId();
    deliverableId = generateId();
    occurredAtUtc = makeUTCDateTime();
    logicalDay = makeLogicalDay();
  });

  // ── Factory ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('returns Right<Execution> with all props set correctly', () => {
      const result = Execution.create({
        professionalProfileId,
        clientId,
        accessGrantId,
        deliverableId,
        occurredAtUtc,
        logicalDay,
        timezoneUsed: 'America/Sao_Paulo',
        createdAtUtc: UTCDateTime.now(),
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const e = result.value;
        expect(e.professionalProfileId).toBe(professionalProfileId);
        expect(e.clientId).toBe(clientId);
        expect(e.accessGrantId).toBe(accessGrantId);
        expect(e.deliverableId).toBe(deliverableId);
        expect(e.occurredAtUtc).toBe(occurredAtUtc);
        expect(e.logicalDay).toBe(logicalDay);
        expect(e.timezoneUsed).toBe('America/Sao_Paulo');
        expect(e.corrections).toHaveLength(0);
        expect(e.hasCorrections).toBe(false);
        expect(e.version).toBe(0);
        expect(e.status).toBe(ExecutionStatus.PENDING);
      }
    });

    it('uses an explicit id when provided', () => {
      const id = generateId();
      const result = Execution.create({
        id,
        professionalProfileId,
        clientId,
        accessGrantId,
        deliverableId,
        occurredAtUtc,
        logicalDay,
        timezoneUsed: 'UTC',
        createdAtUtc: UTCDateTime.now(),
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.id).toBe(id);
      }
    });

    it('generates a UUIDv4 id when none is provided', () => {
      const result = Execution.create({
        professionalProfileId,
        clientId,
        accessGrantId,
        deliverableId,
        occurredAtUtc,
        logicalDay,
        timezoneUsed: 'UTC',
        createdAtUtc: UTCDateTime.now(),
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });
  });

  describe('reconstitute()', () => {
    it('restores all props including status, corrections and version', () => {
      const id = generateId();
      const correction = ExecutionCorrection.create({
        reason: 'Old reason',
        correctedAtUtc: UTCDateTime.now(),
        correctedBy: generateId(),
      });

      const execution = Execution.reconstitute(
        id,
        {
          professionalProfileId,
          clientId,
          accessGrantId,
          deliverableId,
          occurredAtUtc,
          logicalDay,
          timezoneUsed: 'UTC',
          createdAtUtc: UTCDateTime.now(),
          status: ExecutionStatus.CONFIRMED,
          corrections: [correction],
        },
        5,
      );

      expect(execution.id).toBe(id);
      expect(execution.version).toBe(5);
      expect(execution.status).toBe(ExecutionStatus.CONFIRMED);
      expect(execution.corrections).toHaveLength(1);
      expect(execution.hasCorrections).toBe(true);
    });
  });

  // ── Getters ───────────────────────────────────────────────────────────────

  it('exposes all getters', () => {
    const createdAtUtc = UTCDateTime.now();
    const result = Execution.create({
      professionalProfileId,
      clientId,
      accessGrantId,
      deliverableId,
      occurredAtUtc,
      logicalDay,
      timezoneUsed: 'America/Sao_Paulo',
      createdAtUtc,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const e = result.value;
      expect(e.professionalProfileId).toBe(professionalProfileId);
      expect(e.clientId).toBe(clientId);
      expect(e.accessGrantId).toBe(accessGrantId);
      expect(e.deliverableId).toBe(deliverableId);
      expect(e.occurredAtUtc).toBe(occurredAtUtc);
      expect(e.logicalDay).toBe(logicalDay);
      expect(e.timezoneUsed).toBe('America/Sao_Paulo');
      expect(e.createdAtUtc).toBe(createdAtUtc);
      expect(e.corrections).toHaveLength(0);
      expect(e.status).toBe(ExecutionStatus.PENDING);
    }
  });

  // ── corrections getter returns shallow copy ────────────────────────────────

  it('corrections getter returns a shallow copy (mutation does not affect internal state)', () => {
    const execution = makeExecution();
    const copy = execution.corrections as ExecutionCorrection[];
    copy.push(
      ExecutionCorrection.create({
        reason: 'Injected',
        correctedAtUtc: UTCDateTime.now(),
        correctedBy: generateId(),
      }),
    );
    expect(execution.corrections).toHaveLength(0);
  });

  // ── Status transitions (ADR-0005 §9) ─────────────────────────────────────

  describe('confirm()', () => {
    it('transitions PENDING → CONFIRMED and returns Right<void>', () => {
      const execution = makeNewExecution(); // status = PENDING
      expect(execution.status).toBe(ExecutionStatus.PENDING);

      const result = execution.confirm();

      expect(result.isRight()).toBe(true);
      expect(execution.status).toBe(ExecutionStatus.CONFIRMED);
    });

    it('returns Left<InvalidExecutionError> when already CONFIRMED', () => {
      const execution = makeExecution(); // status = CONFIRMED (default)
      const result = execution.confirm();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
      }
      expect(execution.status).toBe(ExecutionStatus.CONFIRMED);
    });

    it('returns Left<InvalidExecutionError> when CANCELLED', () => {
      const execution = makeExecution({ status: ExecutionStatus.CANCELLED });
      const result = execution.confirm();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
      }
      expect(execution.status).toBe(ExecutionStatus.CANCELLED);
    });
  });

  describe('cancel()', () => {
    it('transitions PENDING → CANCELLED and returns Right<void>', () => {
      const execution = makeNewExecution(); // status = PENDING
      expect(execution.status).toBe(ExecutionStatus.PENDING);

      const result = execution.cancel();

      expect(result.isRight()).toBe(true);
      expect(execution.status).toBe(ExecutionStatus.CANCELLED);
    });

    it('returns Left<InvalidExecutionError> when already CONFIRMED', () => {
      const execution = makeExecution(); // status = CONFIRMED (default)
      const result = execution.cancel();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
      }
    });

    it('returns Left<InvalidExecutionError> when already CANCELLED', () => {
      const execution = makeExecution({ status: ExecutionStatus.CANCELLED });
      const result = execution.cancel();

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
      }
    });
  });

  // ── recordCorrection ──────────────────────────────────────────────────────

  describe('recordCorrection()', () => {
    it('appends a correction and returns Right<ExecutionCorrection>', () => {
      const execution = makeExecution({ professionalProfileId }); // CONFIRMED by default
      const correctedBy = generateId();

      const result = execution.recordCorrection('Delivered on wrong date', correctedBy);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const correction = result.value;
        expect(correction.reason).toBe('Delivered on wrong date');
        expect(correction.correctedBy).toBe(correctedBy);
        expect(correction.correctedAtUtc).toBeDefined();
      }

      expect(execution.corrections).toHaveLength(1);
      expect(execution.hasCorrections).toBe(true);
    });

    it('trims whitespace from the reason before storing', () => {
      const execution = makeExecution(); // CONFIRMED by default
      const result = execution.recordCorrection('  trimmed reason  ', generateId());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.reason).toBe('trimmed reason');
      }
    });

    it('returns Left<InvalidExecutionError> when Execution is PENDING (not yet confirmed)', () => {
      const execution = makeNewExecution(); // status = PENDING
      const result = execution.recordCorrection('Some reason', generateId());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
      }
      expect(execution.corrections).toHaveLength(0);
    });

    it('returns Left<InvalidExecutionError> when Execution is CANCELLED', () => {
      const execution = makeExecution({ status: ExecutionStatus.CANCELLED });
      const result = execution.recordCorrection('Some reason', generateId());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.INVALID_EXECUTION);
      }
      expect(execution.corrections).toHaveLength(0);
    });

    it('returns Left<CorrectionReasonRequiredError> for an empty reason string', () => {
      const execution = makeExecution(); // CONFIRMED by default
      const result = execution.recordCorrection('', generateId());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.CORRECTION_REASON_REQUIRED);
      }
      expect(execution.corrections).toHaveLength(0);
    });

    it('returns Left<CorrectionReasonRequiredError> for a whitespace-only reason', () => {
      const execution = makeExecution(); // CONFIRMED by default
      const result = execution.recordCorrection('   ', generateId());

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(ExecutionErrorCodes.CORRECTION_REASON_REQUIRED);
      }
    });

    it('accumulates multiple corrections in order', () => {
      const execution = makeExecution(); // CONFIRMED by default

      execution.recordCorrection('First correction', generateId());
      execution.recordCorrection('Second correction', generateId());

      expect(execution.corrections).toHaveLength(2);
      expect(execution.corrections[0]?.reason).toBe('First correction');
      expect(execution.corrections[1]?.reason).toBe('Second correction');
    });
  });

  // ── hasCorrections ────────────────────────────────────────────────────────

  describe('hasCorrections', () => {
    it('is false for a freshly reconstituted Execution with no corrections', () => {
      const execution = makeExecution();
      expect(execution.hasCorrections).toBe(false);
    });

    it('is true after at least one correction is recorded', () => {
      const execution = makeExecution(); // CONFIRMED by default
      execution.recordCorrection('Valid reason', generateId());
      expect(execution.hasCorrections).toBe(true);
    });
  });
});
