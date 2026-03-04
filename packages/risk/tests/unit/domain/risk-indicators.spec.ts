import { describe, it, expect } from 'vitest';
import { RiskIndicators } from '../../../domain/value-objects/risk-indicators.js';
import { RiskThreshold } from '../../../domain/value-objects/risk-threshold.js';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';

describe('RiskIndicators', () => {
  // ── create() — success ────────────────────────────────────────────────────

  describe('create() — success', () => {
    it('returns Right with valid props and exposes all getters correctly', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 3,
        cancellationRate: 0.25,
        windowDays: 30,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.paymentFailureCount).toBe(3);
        expect(result.value.cancellationRate).toBe(0.25);
        expect(result.value.windowDays).toBe(30);
      }
    });

    it('accepts paymentFailureCount = 0 (minimum valid — no failures)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0,
        windowDays: 1,
      });

      expect(result.isRight()).toBe(true);
    });

    it('accepts cancellationRate = 0 (lower boundary)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
    });

    it('accepts cancellationRate = 1 (upper boundary — 100%)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 1,
        windowDays: 14,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ── create() — paymentFailureCount validation ─────────────────────────────

  describe('create() — paymentFailureCount validation', () => {
    it('returns Left when paymentFailureCount = -1 (negative)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: -1,
        cancellationRate: 0,
        windowDays: 30,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when paymentFailureCount = 0.5 (non-integer)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0.5,
        cancellationRate: 0,
        windowDays: 30,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });

  // ── create() — cancellationRate validation ────────────────────────────────

  describe('create() — cancellationRate validation', () => {
    it('returns Left when cancellationRate = -0.01 (below 0)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: -0.01,
        windowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when cancellationRate = 1.01 (above 1)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 1.01,
        windowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });

  // ── create() — windowDays validation ─────────────────────────────────────

  describe('create() — windowDays validation', () => {
    it('returns Left when windowDays = 0', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0,
        windowDays: 0,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when windowDays = 1.5 (non-integer)', () => {
      const result = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0,
        windowDays: 1.5,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });

  // ── isPaymentFailureThresholdExceeded() ───────────────────────────────────

  describe('isPaymentFailureThresholdExceeded()', () => {
    const threshold = RiskThreshold.defaults(); // limit = 3

    it('returns true when count >= limit (boundary: count=3, limit=3)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 3,
        cancellationRate: 0,
        windowDays: 30,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isPaymentFailureThresholdExceeded(threshold)).toBe(true);
      }
    });

    it('returns true when count > limit (count=4, limit=3)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 4,
        cancellationRate: 0,
        windowDays: 30,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isPaymentFailureThresholdExceeded(threshold)).toBe(true);
      }
    });

    it('returns false when count < limit (count=2, limit=3)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 2,
        cancellationRate: 0,
        windowDays: 30,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isPaymentFailureThresholdExceeded(threshold)).toBe(false);
      }
    });

    it('returns false when count = 0 (no failures)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0,
        windowDays: 30,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isPaymentFailureThresholdExceeded(threshold)).toBe(false);
      }
    });
  });

  // ── isCancellationRateThresholdExceeded() ────────────────────────────────

  describe('isCancellationRateThresholdExceeded()', () => {
    const threshold = RiskThreshold.defaults(); // limit = 0.30, exclusive

    it('returns false when rate = limit exactly (boundary: rate=0.30, limit=0.30)', () => {
      // Critical: exclusive comparison — at-limit does NOT trigger (ADR-0053 §4 Invariant 3)
      const indicators = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0.3,
        windowDays: 14,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isCancellationRateThresholdExceeded(threshold)).toBe(false);
      }
    });

    it('returns true when rate > limit (rate=0.31, limit=0.30)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0.31,
        windowDays: 14,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isCancellationRateThresholdExceeded(threshold)).toBe(true);
      }
    });

    it('returns false when rate < limit (rate=0.20, limit=0.30)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0.2,
        windowDays: 14,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isCancellationRateThresholdExceeded(threshold)).toBe(false);
      }
    });

    it('returns false when rate = 0 (no cancellations)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 0,
        windowDays: 14,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isCancellationRateThresholdExceeded(threshold)).toBe(false);
      }
    });

    it('returns true when rate = 1 (100% cancellation)', () => {
      const indicators = RiskIndicators.create({
        paymentFailureCount: 0,
        cancellationRate: 1,
        windowDays: 14,
      });

      expect(indicators.isRight()).toBe(true);
      if (indicators.isRight()) {
        expect(indicators.value.isCancellationRateThresholdExceeded(threshold)).toBe(true);
      }
    });
  });
});
