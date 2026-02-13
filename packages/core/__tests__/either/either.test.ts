import { describe, it, expect } from 'vitest';
import { Left, Right, left, right } from '../../either/either.js';

describe('Left', () => {
  it('stores the value', () => {
    const l = new Left<string, number>('error');
    expect(l.value).toBe('error');
  });

  it('_tag is "Left"', () => {
    expect(new Left('e')._tag).toBe('Left');
  });

  it('isLeft() returns true', () => {
    expect(new Left('e').isLeft()).toBe(true);
  });

  it('isRight() returns false', () => {
    expect(new Left('e').isRight()).toBe(false);
  });
});

describe('Right', () => {
  it('stores the value', () => {
    const r = new Right<string, number>(42);
    expect(r.value).toBe(42);
  });

  it('_tag is "Right"', () => {
    expect(new Right(42)._tag).toBe('Right');
  });

  it('isRight() returns true', () => {
    expect(new Right(42).isRight()).toBe(true);
  });

  it('isLeft() returns false', () => {
    expect(new Right(42).isLeft()).toBe(false);
  });
});

describe('left()', () => {
  it('creates a Left instance with the given value', () => {
    const result = left<string, number>('failure');
    expect(result).toBeInstanceOf(Left);
    expect(result.value).toBe('failure');
    expect(result.isLeft()).toBe(true);
  });
});

describe('right()', () => {
  it('creates a Right instance with the given value', () => {
    const result = right<string, number>(99);
    expect(result).toBeInstanceOf(Right);
    expect(result.value).toBe(99);
    expect(result.isRight()).toBe(true);
  });
});
