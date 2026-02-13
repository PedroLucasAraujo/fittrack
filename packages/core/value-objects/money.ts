import { ValueObject } from './value-object';
import { DomainInvariantError } from '../errors/domain-invariant-error';
import { ErrorCodes } from '../errors/error-codes';
import type { DomainResult } from '../either/domain-result';
import { right, left } from '../either/either';

interface MoneyProps {
  /**
   * Amount in the smallest indivisible currency unit.
   * For BRL: centavos (R$ 99,90 → 9990).
   * For USD: cents ($ 99.90 → 9990).
   * Always a non-negative integer — never a float.
   */
  amount: number;
  /** ISO 4217 currency code: 3 uppercase letters (e.g., "BRL", "USD", "EUR"). */
  currency: string;
}

/**
 * Monetary value expressed as an integer amount in the smallest currency unit
 * plus an ISO 4217 currency code (ADR-0047 §4).
 *
 * ## Why integers?
 *
 * Floating-point arithmetic in JavaScript is unsafe for financial values:
 * `0.1 + 0.2 === 0.30000000000000004`. All business logic must operate on the
 * integer `amount` field. The `toDecimal()` helper is provided only for
 * display purposes — never for calculations.
 *
 * ## Usage
 *
 * ```typescript
 * // R$ 99,90
 * const result = Money.create(9990, 'BRL');
 * if (result.isRight()) {
 *   result.value.amount;      // 9990
 *   result.value.currency;    // "BRL"
 *   result.value.toDecimal(); // 99.9 — display only
 * }
 * ```
 */
export class Money extends ValueObject<MoneyProps> {
  /** ISO 4217 currency code pattern: exactly 3 uppercase ASCII letters. */
  private static readonly CURRENCY_REGEX = /^[A-Z]{3}$/;

  private constructor(props: MoneyProps) {
    super(props);
  }

  /**
   * Creates a `Money` value object.
   *
   * @param amount   - Non-negative integer in the smallest currency unit
   *                   (centavos, cents, etc.). Floats are rejected.
   * @param currency - ISO 4217 3-letter uppercase code (e.g., "BRL").
   *
   * Returns `Left<DomainInvariantError>` on validation failure so that callers
   * can handle the error without a try/catch block via `DomainResult`.
   */
  static create(amount: number, currency: string): DomainResult<Money> {
    if (!Number.isInteger(amount)) {
      return left(
        new DomainInvariantError(
          `Money amount must be a non-negative integer representing the smallest currency unit ` +
            `(e.g., centavos for BRL). Received: ${amount}. ` +
            `Example: R$ 99,90 → 9990.`,
          ErrorCodes.INVALID_MONEY_VALUE,
          { amount },
        ),
      );
    }

    if (amount < 0) {
      return left(
        new DomainInvariantError(
          `Money amount cannot be negative. Received: ${amount}.`,
          ErrorCodes.INVALID_MONEY_VALUE,
          { amount },
        ),
      );
    }

    if (!Money.CURRENCY_REGEX.test(currency)) {
      return left(
        new DomainInvariantError(
          `Currency must be a 3-letter ISO 4217 uppercase code (e.g., "BRL", "USD", "EUR"). ` +
            `Received: "${currency}".`,
          ErrorCodes.INVALID_CURRENCY,
          { currency },
        ),
      );
    }

    return right(new Money({ amount, currency }));
  }

  /** Amount in the smallest currency unit (centavos, cents…). Always an integer. */
  get amount(): number {
    return this.props.amount;
  }

  /** ISO 4217 currency code. */
  get currency(): string {
    return this.props.currency;
  }

  /**
   * Decimal representation of the amount for display purposes only.
   *
   * **Do not use this value in business logic or arithmetic.** Always use
   * the integer `amount` field for calculations to avoid floating-point errors.
   */
  toDecimal(): number {
    return this.props.amount / 100;
  }

  toString(): string {
    return `${this.toDecimal().toFixed(2)} ${this.props.currency}`;
  }
}
