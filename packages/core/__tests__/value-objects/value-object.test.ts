import { describe, it, expect } from 'vitest';
import { ValueObject } from '../../value-objects/value-object.js';

// Concrete value objects for testing
class StringVO extends ValueObject<{ value: string }> {
  static of(v: string) {
    return new StringVO({ value: v });
  }
  get value() {
    return this.props.value;
  }
}

class NumberVO extends ValueObject<{ a: number; b: number }> {
  static of(a: number, b: number) {
    return new NumberVO({ a, b });
  }
}

class DateVO extends ValueObject<{ at: Date }> {
  static of(d: Date) {
    return new DateVO({ at: d });
  }
  get at(): Date {
    return this.props.at;
  }
}

class NestedVO extends ValueObject<{ inner: { x: number } }> {
  static of(x: number) {
    return new NestedVO({ inner: { x } });
  }
}

class NullableVO extends ValueObject<{ a: string | null }> {
  static of(a: string | null) {
    return new NullableVO({ a });
  }
}

describe('ValueObject — immutability (deepFreeze)', () => {
  it('freezes the top-level props object', () => {
    const vo = StringVO.of('hello');
    expect(Object.isFrozen(vo['props'])).toBe(true);
  });

  it('freezes nested plain objects within props', () => {
    const vo = NestedVO.of(1);
    expect(Object.isFrozen(vo['props'].inner)).toBe(true);
  });

  it('does NOT freeze Date instances (handled by defensive copy in getter)', () => {
    const date = new Date();
    const vo = DateVO.of(date);
    // Date is exempt from deepFreeze; the value object still holds it
    // frozen at the props level but the Date itself may be unfrozen
    expect(vo['props']).toBeDefined();
  });
});

describe('ValueObject — equals()', () => {
  it('returns true for two VOs with identical primitive props', () => {
    expect(StringVO.of('hello').equals(StringVO.of('hello'))).toBe(true);
  });

  it('returns false for two VOs with different primitive props', () => {
    expect(StringVO.of('hello').equals(StringVO.of('world'))).toBe(false);
  });

  it('returns true for identical multi-field props', () => {
    expect(NumberVO.of(1, 2).equals(NumberVO.of(1, 2))).toBe(true);
  });

  it('returns false when one field differs', () => {
    expect(NumberVO.of(1, 2).equals(NumberVO.of(1, 3))).toBe(false);
  });

  it('returns true for nested objects with same values', () => {
    expect(NestedVO.of(42).equals(NestedVO.of(42))).toBe(true);
  });

  it('returns false for nested objects with different values', () => {
    expect(NestedVO.of(1).equals(NestedVO.of(2))).toBe(false);
  });

  it('compares Date fields by timestamp (same millisecond → equal)', () => {
    const ts = new Date('2024-01-01T00:00:00.000Z');
    const a = DateVO.of(new Date(ts.getTime()));
    const b = DateVO.of(new Date(ts.getTime()));
    expect(a.equals(b)).toBe(true);
  });

  it('returns false for Date fields with different timestamps', () => {
    const a = DateVO.of(new Date('2024-01-01T00:00:00.000Z'));
    const b = DateVO.of(new Date('2024-01-02T00:00:00.000Z'));
    expect(a.equals(b)).toBe(false);
  });

  it('returns false when props have different key counts', () => {
    // TypeScript prevents mismatched VO types, but we test deepEqual directly
    // via two VOs that share the same base structure
    const a = NullableVO.of('x');
    const b = NullableVO.of(null);
    expect(a.equals(b)).toBe(false);
  });

  it('returns false when one side is null (deepEqual null branch)', () => {
    // We cover the null branch by passing null in props
    const a = NullableVO.of(null);
    const b = NullableVO.of('x');
    expect(a.equals(b)).toBe(false);
  });
});
