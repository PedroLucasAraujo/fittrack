/**
 * Recursively freezes an object and all reachable nested objects.
 *
 * `Date` instances are intentionally skipped: `Object.freeze` on a `Date`
 * prevents property addition but does NOT prevent mutation via Date prototype
 * methods (setFullYear, setMonth, etc.), because the internal date value is
 * stored in an internal slot rather than as an own property. Value objects
 * that wrap `Date` must return defensive copies from their getters instead of
 * relying on this freeze to guarantee immutability.
 */
function deepFreeze<T>(obj: T): T {
  /* v8 ignore next 3 */
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  Object.getOwnPropertyNames(obj).forEach((name) => {
    const value = (obj as Record<string, unknown>)[name];
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      deepFreeze(value);
    }
  });

  return Object.freeze(obj);
}

/**
 * Base class for all value objects (ADR-0047 §4).
 *
 * Value objects:
 *   - Have no identity — they are identified solely by their value.
 *   - Are immutable: `props` is deeply frozen at construction time.
 *   - Are replaced, never mutated in place.
 *   - Implement structural equality via `equals()`.
 *
 * Subclasses must expose only getter methods; no setters are permitted.
 * Subclasses that wrap `Date` fields must return defensive copies in their
 * getters (see `UTCDateTime.value`).
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = deepFreeze(props) as T;
  }

  /**
   * Structural equality: two value objects are equal when all their props are
   * recursively equal. `Date` fields are compared by their millisecond
   * timestamp (`getTime()`), not by reference.
   */
  equals(vo: ValueObject<T>): boolean {
    return ValueObject.deepEqual(this.props, vo.props);
  }

  private static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (
      a === null ||
      b === null ||
      typeof a !== 'object' ||
      typeof b !== 'object'
    ) {
      return false;
    }

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    /* v8 ignore next */
    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      ValueObject.deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }
}
