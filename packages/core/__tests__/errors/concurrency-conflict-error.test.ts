import { describe, it, expect } from 'vitest';
import { ConcurrencyConflictError } from '../../errors/concurrency-conflict-error.js';
import { DomainError } from '../../errors/domain-error.js';
import { ErrorCodes } from '../../errors/error-codes.js';

describe('ConcurrencyConflictError', () => {
  const TYPE = 'Booking';
  const ID = '11111111-1111-4111-8111-111111111111';

  it('is an instance of Error', () => {
    expect(new ConcurrencyConflictError(TYPE, ID)).toBeInstanceOf(Error);
  });

  it('is an instance of DomainError', () => {
    expect(new ConcurrencyConflictError(TYPE, ID)).toBeInstanceOf(DomainError);
  });

  it('code is CONCURRENCY_CONFLICT', () => {
    const err = new ConcurrencyConflictError(TYPE, ID);
    expect(err.code).toBe(ErrorCodes.CONCURRENCY_CONFLICT);
  });

  it('message includes aggregateType and aggregateId', () => {
    const err = new ConcurrencyConflictError(TYPE, ID);
    expect(err.message).toContain(TYPE);
    expect(err.message).toContain(ID);
  });

  it('context carries aggregateType and aggregateId', () => {
    const err = new ConcurrencyConflictError(TYPE, ID);
    expect(err.context).toEqual({ aggregateType: TYPE, aggregateId: ID });
  });

  it('name is "ConcurrencyConflictError"', () => {
    const err = new ConcurrencyConflictError(TYPE, ID);
    expect(err.name).toBe('ConcurrencyConflictError');
  });
});
