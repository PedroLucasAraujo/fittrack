import { describe, it, expect } from 'vitest';
import { DomainInvariantError } from '../../errors/domain-invariant-error.js';
import { DomainError } from '../../errors/domain-error.js';
import { ErrorCodes } from '../../errors/error-codes.js';

describe('DomainInvariantError', () => {
  it('is an instance of Error', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID);
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of DomainError', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID);
    expect(err).toBeInstanceOf(DomainError);
  });

  it('sets message correctly', () => {
    const err = new DomainInvariantError('test message', ErrorCodes.TEMPORAL_VIOLATION);
    expect(err.message).toBe('test message');
  });

  it('sets code correctly', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_STATE_TRANSITION);
    expect(err.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('sets name to "DomainInvariantError"', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID);
    expect(err.name).toBe('DomainInvariantError');
  });

  it('context is undefined when not provided', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID);
    expect(err.context).toBeUndefined();
  });

  it('sets context when provided', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID, { field: 'id', received: 'bad' });
    expect(err.context).toEqual({ field: 'id', received: 'bad' });
  });

  it('freezes the context object', () => {
    const ctx = { field: 'id' };
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID, ctx);
    expect(Object.isFrozen(err.context)).toBe(true);
  });

  it('has a stack trace', () => {
    const err = new DomainInvariantError('msg', ErrorCodes.INVALID_UUID);
    expect(err.stack).toBeDefined();
  });
});
