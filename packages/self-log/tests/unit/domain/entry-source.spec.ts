import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { EntrySource } from '../../../domain/value-objects/entry-source.js';
import { EntrySourceType } from '../../../domain/enums/entry-source-type.js';
import { SelfLogErrorCodes } from '../../../domain/errors/self-log-error-codes.js';

describe('EntrySource', () => {
  // ── self() factory ──────────────────────────────────────────────────────────

  describe('self()', () => {
    it('creates an EntrySource with sourceType=SELF and sourceId=null', () => {
      const source = EntrySource.self();

      expect(source.sourceType).toBe(EntrySourceType.SELF);
      expect(source.sourceId).toBeNull();
    });

    it('isSelf returns true and isExecution returns false', () => {
      const source = EntrySource.self();

      expect(source.isSelf).toBe(true);
      expect(source.isExecution).toBe(false);
    });
  });

  // ── execution() factory ──────────────────────────────────────────────────────

  describe('execution()', () => {
    it('creates an EntrySource with sourceType=EXECUTION and the provided executionId', () => {
      const executionId = generateId();
      const result = EntrySource.execution(executionId);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const source = result.value;
        expect(source.sourceType).toBe(EntrySourceType.EXECUTION);
        expect(source.sourceId).toBe(executionId);
      }
    });

    it('isExecution returns true and isSelf returns false', () => {
      const result = EntrySource.execution(generateId());

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.isExecution).toBe(true);
        expect(result.value.isSelf).toBe(false);
      }
    });

    it('returns Left<InvalidSelfLogEntryError> for an empty string', () => {
      const result = EntrySource.execution('');

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
      }
    });

    it('returns Left<InvalidSelfLogEntryError> for a non-UUID string', () => {
      const result = EntrySource.execution('not-a-uuid');

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(SelfLogErrorCodes.INVALID_ENTRY);
      }
    });

    it('returns Left<InvalidSelfLogEntryError> for a UUIDv1 (wrong version bit)', () => {
      const result = EntrySource.execution('550e8400-e29b-11d4-a716-446655440000');

      expect(result.isLeft()).toBe(true);
    });
  });

  // ── Value object equality ───────────────────────────────────────────────────

  describe('equals()', () => {
    it('two SELF sources are equal', () => {
      const a = EntrySource.self();
      const b = EntrySource.self();

      expect(a.equals(b)).toBe(true);
    });

    it('two EXECUTION sources with the same executionId are equal', () => {
      const id = generateId();
      const a = EntrySource.execution(id);
      const b = EntrySource.execution(id);

      expect(a.isRight()).toBe(true);
      expect(b.isRight()).toBe(true);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('two EXECUTION sources with different executionIds are not equal', () => {
      const a = EntrySource.execution(generateId());
      const b = EntrySource.execution(generateId());

      expect(a.isRight()).toBe(true);
      expect(b.isRight()).toBe(true);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });

    it('a SELF source and an EXECUTION source are not equal', () => {
      const selfSource = EntrySource.self();
      const execResult = EntrySource.execution(generateId());

      expect(execResult.isRight()).toBe(true);
      if (execResult.isRight()) {
        expect(selfSource.equals(execResult.value)).toBe(false);
      }
    });
  });
});
