import { ValueObject } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import { InvalidRiskIndicatorError } from '../errors/invalid-risk-indicator-error.js';

interface RiskThresholdProps {
  paymentFailureLimit: number;
  cancellationRateLimit: number;
  paymentWindowDays: number;
  cancellationWindowDays: number;
}

/**
 * Immutable value object encoding the threshold values that trigger automatic
 * WATCHLIST escalation (ADR-0053 §2).
 *
 * Default values (ADR-0053 Invariant 1):
 * - paymentFailureLimit: 3 failures in window
 * - cancellationRateLimit: 0.30 (30% of sessions, exclusive)
 * - paymentWindowDays: 30
 * - cancellationWindowDays: 14
 *
 * No magic numbers in use cases — all comparisons must use this VO via
 * `RiskThreshold.defaults()` or a custom instance from `RiskThreshold.create()`.
 */
export class RiskThreshold extends ValueObject<RiskThresholdProps> {
  private static readonly DEFAULT_PAYMENT_FAILURE_LIMIT = 3;
  private static readonly DEFAULT_CANCELLATION_RATE_LIMIT = 0.3;
  private static readonly DEFAULT_PAYMENT_WINDOW_DAYS = 30;
  private static readonly DEFAULT_CANCELLATION_WINDOW_DAYS = 14;

  private constructor(props: RiskThresholdProps) {
    super(props);
  }

  /** Returns the canonical default RiskThreshold instance (ADR-0053 Invariant 1). */
  static defaults(): RiskThreshold {
    return new RiskThreshold({
      paymentFailureLimit: RiskThreshold.DEFAULT_PAYMENT_FAILURE_LIMIT,
      cancellationRateLimit: RiskThreshold.DEFAULT_CANCELLATION_RATE_LIMIT,
      paymentWindowDays: RiskThreshold.DEFAULT_PAYMENT_WINDOW_DAYS,
      cancellationWindowDays: RiskThreshold.DEFAULT_CANCELLATION_WINDOW_DAYS,
    });
  }

  /**
   * Creates a custom RiskThreshold instance.
   *
   * Validation rules (ADR-0053 §2):
   * - paymentFailureLimit: positive integer (≥ 1)
   * - cancellationRateLimit: float in [0, 1] inclusive
   * - paymentWindowDays: positive integer (≥ 1)
   * - cancellationWindowDays: positive integer (≥ 1)
   */
  static create(props: {
    paymentFailureLimit: number;
    cancellationRateLimit: number;
    paymentWindowDays: number;
    cancellationWindowDays: number;
  }): DomainResult<RiskThreshold> {
    if (!Number.isInteger(props.paymentFailureLimit) || props.paymentFailureLimit < 1) {
      return left(new InvalidRiskIndicatorError('paymentFailureLimit must be a positive integer'));
    }
    if (props.cancellationRateLimit < 0 || props.cancellationRateLimit > 1) {
      return left(
        new InvalidRiskIndicatorError('cancellationRateLimit must be between 0 and 1 inclusive'),
      );
    }
    if (!Number.isInteger(props.paymentWindowDays) || props.paymentWindowDays < 1) {
      return left(new InvalidRiskIndicatorError('paymentWindowDays must be a positive integer'));
    }
    if (!Number.isInteger(props.cancellationWindowDays) || props.cancellationWindowDays < 1) {
      return left(
        new InvalidRiskIndicatorError('cancellationWindowDays must be a positive integer'),
      );
    }
    return right(new RiskThreshold(props));
  }

  get paymentFailureLimit(): number {
    return this.props.paymentFailureLimit;
  }

  get cancellationRateLimit(): number {
    return this.props.cancellationRateLimit;
  }

  get paymentWindowDays(): number {
    return this.props.paymentWindowDays;
  }

  get cancellationWindowDays(): number {
    return this.props.cancellationWindowDays;
  }
}
