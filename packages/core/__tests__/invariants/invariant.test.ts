import { describe, it, expect } from 'vitest';
import { invariant } from '../../invariants/invariant.js';
import { DomainInvariantError } from '../../errors/domain-invariant-error.js';
import { ErrorCodes } from '../../errors/error-codes.js';

describe('invariant()', () => {
  it('does not throw when condition is true', () => {
    expect(() => invariant(true, 'should not throw', ErrorCodes.INVALID_ARGUMENT)).not.toThrow();
  });

  it('throws DomainInvariantError when condition is false', () => {
    expect(() => invariant(false, 'violated', ErrorCodes.INVALID_STATE_TRANSITION)).toThrow(
      DomainInvariantError,
    );
  });

  it('thrown error carries the provided message', () => {
    expect(() =>
      invariant(false, 'custom message', ErrorCodes.INVALID_UUID),
    ).toThrow('custom message');
  });

  it('thrown error carries the provided error code', () => {
    try {
      invariant(false, 'msg', ErrorCodes.TEMPORAL_VIOLATION);
    } catch (err) {
      expect(err).toBeInstanceOf(DomainInvariantError);
      expect((err as DomainInvariantError).code).toBe('TEMPORAL_VIOLATION');
    }
  });

  it('thrown error carries the context when provided', () => {
    try {
      invariant(false, 'msg', ErrorCodes.INVALID_UUID, { field: 'id', got: 'bad' });
    } catch (err) {
      expect((err as DomainInvariantError).context).toEqual({ field: 'id', got: 'bad' });
    }
  });

  it('context is undefined when not provided', () => {
    try {
      invariant(false, 'msg', ErrorCodes.INVALID_UUID);
    } catch (err) {
      expect((err as DomainInvariantError).context).toBeUndefined();
    }
  });
});
