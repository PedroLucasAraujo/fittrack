import { ValueObject, Money, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidPlatformFeeError } from '../errors/invalid-platform-fee-error.js';

interface PlatformFeeProps {
  /** Total transaction amount in integer cents. */
  totalAmount: Money;
  /** Fee percentage in basis points (e.g. 1000 = 10.00%). */
  feePercentage: number;
  /** Platform's share in integer cents (floor of totalAmount * feePercentage / 10000). */
  platformAmount: Money;
  /** Professional's share in integer cents (totalAmount - platformAmount). */
  professionalAmount: Money;
}

/**
 * Represents the platform fee split for a transaction (ADR-0019 §6).
 *
 * The platform recognizes only the `platformAmount` component as platform
 * revenue. All remaining amount belongs to the professional.
 *
 * Fee percentage is expressed in basis points (integer):
 * - 1000 = 10.00%
 * - 500 = 5.00%
 * - 2500 = 25.00%
 *
 * All amounts are integer cents — never floating point (ADR-0004).
 */
export class PlatformFee extends ValueObject<PlatformFeeProps> {
  private constructor(props: PlatformFeeProps) {
    super(props);
  }

  /**
   * Creates a PlatformFee from a total amount and fee percentage in basis points.
   *
   * @param totalAmount   - Total transaction amount (Money value object)
   * @param feePercentage - Fee in basis points (0–10000 inclusive). Must be a non-negative integer.
   */
  static create(
    totalAmount: Money,
    feePercentage: number,
  ): DomainResult<PlatformFee> {
    if (!Number.isInteger(feePercentage)) {
      return left(
        new InvalidPlatformFeeError(
          `Fee percentage must be an integer in basis points. Received: ${feePercentage}.`,
          { feePercentage },
        ),
      );
    }

    if (feePercentage < 0 || feePercentage > 10000) {
      return left(
        new InvalidPlatformFeeError(
          `Fee percentage must be between 0 and 10000 basis points (0%–100%). Received: ${feePercentage}.`,
          { feePercentage },
        ),
      );
    }

    const platformCents = Math.floor(
      (totalAmount.amount * feePercentage) / 10000,
    );
    const professionalCents = totalAmount.amount - platformCents;

    const platformMoneyResult = Money.create(platformCents, totalAmount.currency);
    /* v8 ignore next */
    if (platformMoneyResult.isLeft()) return left(platformMoneyResult.value);

    const professionalMoneyResult = Money.create(
      professionalCents,
      totalAmount.currency,
    );
    /* v8 ignore next */
    if (professionalMoneyResult.isLeft()) return left(professionalMoneyResult.value);

    return right(
      new PlatformFee({
        totalAmount,
        feePercentage,
        platformAmount: platformMoneyResult.value,
        professionalAmount: professionalMoneyResult.value,
      }),
    );
  }

  get totalAmount(): Money {
    return this.props.totalAmount;
  }

  get feePercentage(): number {
    return this.props.feePercentage;
  }

  get platformAmount(): Money {
    return this.props.platformAmount;
  }

  get professionalAmount(): Money {
    return this.props.professionalAmount;
  }
}
