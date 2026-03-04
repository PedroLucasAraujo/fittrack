import { ValueObject } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { left, right } from '@fittrack/core';
import { InvalidRiskIndicatorError } from '../errors/invalid-risk-indicator-error.js';
import type { RiskThreshold } from './risk-threshold.js';

interface RiskIndicatorsProps {
  paymentFailureCount: number;
  cancellationRate: number;
  windowDays: number;
}

/**
 * Validated snapshot of risk metrics for a single observation window (ADR-0053 §3).
 *
 * Infrastructure event handlers are responsible for pre-computing metric
 * counts and rates before constructing this VO. The Risk domain contains
 * no query ports for Billing or Scheduling data (ADR-0001 §4).
 *
 * When checking payment failures, pass `cancellationRate = 0`.
 * When checking cancellation rate, pass `paymentFailureCount = 0`.
 * These represent distinct, independent observations.
 *
 * ## Comparison semantics (ADR-0053 §4)
 * - Payment failures: inclusive `>=` (reaching the limit triggers escalation)
 * - Cancellation rate: exclusive `>` (rate must strictly exceed the limit)
 */
export class RiskIndicators extends ValueObject<RiskIndicatorsProps> {
  private constructor(props: RiskIndicatorsProps) {
    super(props);
  }

  /**
   * Validation rules (ADR-0053 §3):
   * - paymentFailureCount: non-negative integer (≥ 0)
   * - cancellationRate: float in [0, 1] inclusive
   * - windowDays: positive integer (≥ 1)
   */
  static create(props: {
    paymentFailureCount: number;
    cancellationRate: number;
    windowDays: number;
  }): DomainResult<RiskIndicators> {
    if (!Number.isInteger(props.paymentFailureCount) || props.paymentFailureCount < 0) {
      return left(
        new InvalidRiskIndicatorError('paymentFailureCount must be a non-negative integer'),
      );
    }
    if (props.cancellationRate < 0 || props.cancellationRate > 1) {
      return left(
        new InvalidRiskIndicatorError('cancellationRate must be between 0 and 1 inclusive'),
      );
    }
    if (!Number.isInteger(props.windowDays) || props.windowDays < 1) {
      return left(new InvalidRiskIndicatorError('windowDays must be a positive integer'));
    }
    return right(new RiskIndicators(props));
  }

  /**
   * Returns `true` when `paymentFailureCount >= threshold.paymentFailureLimit`.
   * Inclusive comparison: reaching the limit is sufficient to trigger escalation
   * (ADR-0053 §4, Invariant 2).
   */
  isPaymentFailureThresholdExceeded(threshold: RiskThreshold): boolean {
    return this.props.paymentFailureCount >= threshold.paymentFailureLimit;
  }

  /**
   * Returns `true` when `cancellationRate > threshold.cancellationRateLimit`.
   * Exclusive comparison: rate must strictly exceed the limit; a rate exactly
   * at the limit is within acceptable bounds (ADR-0053 §4, Invariant 3).
   */
  isCancellationRateThresholdExceeded(threshold: RiskThreshold): boolean {
    return this.props.cancellationRate > threshold.cancellationRateLimit;
  }

  get paymentFailureCount(): number {
    return this.props.paymentFailureCount;
  }

  get cancellationRate(): number {
    return this.props.cancellationRate;
  }

  get windowDays(): number {
    return this.props.windowDays;
  }
}
