/**
 * Represents the failure (left-hand) side of an `Either<L, R>` value.
 *
 * By convention `L` carries a `DomainError` (or subclass) — the typed error
 * returned by domain operations that can fail without throwing. Callers
 * discriminate via `isLeft()` / `isRight()` or the `_tag` literal type.
 */
export class Left<L, R> {
  readonly _tag = "Left";
  readonly value: L;

  constructor(value: L) {
    this.value = value;
  }

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }
}

/**
 * Represents the success (right-hand) side of an `Either<L, R>` value.
 *
 * By convention `R` is the happy-path payload returned when a domain
 * operation succeeds. Callers discriminate via `isLeft()` / `isRight()` or
 * the `_tag` literal type.
 */
export class Right<L, R> {
  readonly _tag = "Right";
  readonly value: R;

  constructor(value: R) {
    this.value = value;
  }

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }
}

/**
 * Discriminated union that models a value that is either a failure (`Left`)
 * or a success (`Right`).
 *
 * Used throughout the domain layer as the typed return type for operations
 * that can fail without throwing (value-object factories, aggregate methods).
 * See `DomainResult<T>` for the concrete alias used in domain interfaces.
 *
 * Prefer the `left()` and `right()` factory helpers over `new Left()` /
 * `new Right()` to benefit from generic type inference.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Either<string, number> {
 *   if (b === 0) return left('division by zero');
 *   return right(a / b);
 * }
 * const result = divide(10, 2);
 * if (result.isRight()) console.log(result.value); // 5
 * ```
 */
export type Either<L, R> = Left<L, R> | Right<L, R>;

/** Creates a `Left<L, R>` (failure) value. */
export const left = <L, R>(value: L): Either<L, R> => new Left(value);

/** Creates a `Right<L, R>` (success) value. */
export const right = <L, R>(value: R): Either<L, R> => new Right(value);
