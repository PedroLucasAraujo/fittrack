import { DomainInvariantError } from "../errors/domain-invariant-error";
import type { ErrorCode } from "../errors/error-codes";

/**
 * Asserts a domain invariant inside an aggregate root's domain methods.
 *
 * Throws `DomainInvariantError` if `condition` is `false`. The TypeScript
 * `asserts condition` return type narrows the condition to `true` for all
 * code that follows the call, enabling compile-time type narrowing.
 *
 * ## When to use `invariant()` vs `DomainResult<T>`
 *
 * | Scenario | Recommended approach |
 * |---|---|
 * | Input from an external actor (user, API, event) | `DomainResult<T>` — return `Left<DomainInvariantError>` from a factory |
 * | Internal guard that must hold by construction | `invariant()` — throw on programmer error |
 * | State-transition guard inside an aggregate method | `invariant()` — caller is responsible for pre-checking |
 *
 * `invariant()` is for conditions that are *impossible* to violate if the
 * application layer is correctly implemented. If the condition can be violated
 * by valid user input, use a factory returning `DomainResult<T>` instead.
 *
 * @param condition - The invariant that must be `true`.
 * @param message   - Human-readable description of the violated invariant.
 * @param code      - Typed `ErrorCode` from `ErrorCodes`.
 * @param context   - Optional key-value diagnostic data (no PII — ADR-0037).
 *
 * @throws `DomainInvariantError` when `condition` is `false`.
 */
export function invariant(
  condition: boolean,
  message: string,
  code: ErrorCode,
  context?: Record<string, unknown>,
): asserts condition {
  if (!condition) {
    throw new DomainInvariantError(message, code, context);
  }
}
