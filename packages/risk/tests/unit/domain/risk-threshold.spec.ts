import { describe, it, expect } from 'vitest';
import { RiskThreshold } from '../../../domain/value-objects/risk-threshold.js';
import { RiskErrorCodes } from '../../../domain/errors/risk-error-codes.js';

describe('RiskThreshold', () => {
  // ── defaults() ────────────────────────────────────────────────────────────

  describe('defaults()', () => {
    it('returns canonical default values (ADR-0053 Invariant 1)', () => {
      const threshold = RiskThreshold.defaults();

      expect(threshold.paymentFailureLimit).toBe(3);
      expect(threshold.cancellationRateLimit).toBe(0.3);
      expect(threshold.paymentWindowDays).toBe(30);
      expect(threshold.cancellationWindowDays).toBe(14);
    });
  });

  // ── create() — success ────────────────────────────────────────────────────

  describe('create() — success', () => {
    it('returns Right with a valid custom threshold instance', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 5,
        cancellationRateLimit: 0.5,
        paymentWindowDays: 60,
        cancellationWindowDays: 7,
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.paymentFailureLimit).toBe(5);
        expect(result.value.cancellationRateLimit).toBe(0.5);
        expect(result.value.paymentWindowDays).toBe(60);
        expect(result.value.cancellationWindowDays).toBe(7);
      }
    });

    it('accepts cancellationRateLimit = 0 (lower boundary)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 1,
        cancellationRateLimit: 0,
        paymentWindowDays: 1,
        cancellationWindowDays: 1,
      });

      expect(result.isRight()).toBe(true);
    });

    it('accepts cancellationRateLimit = 1 (upper boundary)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 1,
        cancellationRateLimit: 1,
        paymentWindowDays: 1,
        cancellationWindowDays: 1,
      });

      expect(result.isRight()).toBe(true);
    });

    it('accepts paymentFailureLimit = 1 (minimum positive integer)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 1,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 30,
        cancellationWindowDays: 14,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ── create() — paymentFailureLimit validation ─────────────────────────────

  describe('create() — paymentFailureLimit validation', () => {
    it('returns Left when paymentFailureLimit = 0', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 0,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 30,
        cancellationWindowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when paymentFailureLimit is not an integer (1.5)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 1.5,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 30,
        cancellationWindowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });

  // ── create() — cancellationRateLimit validation ───────────────────────────

  describe('create() — cancellationRateLimit validation', () => {
    it('returns Left when cancellationRateLimit = -0.01 (below 0)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 3,
        cancellationRateLimit: -0.01,
        paymentWindowDays: 30,
        cancellationWindowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when cancellationRateLimit = 1.01 (above 1)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 3,
        cancellationRateLimit: 1.01,
        paymentWindowDays: 30,
        cancellationWindowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });

  // ── create() — paymentWindowDays validation ───────────────────────────────

  describe('create() — paymentWindowDays validation', () => {
    it('returns Left when paymentWindowDays = 0', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 3,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 0,
        cancellationWindowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when paymentWindowDays is not an integer (1.5)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 3,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 1.5,
        cancellationWindowDays: 14,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });

  // ── create() — cancellationWindowDays validation ──────────────────────────

  describe('create() — cancellationWindowDays validation', () => {
    it('returns Left when cancellationWindowDays = 0', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 3,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 30,
        cancellationWindowDays: 0,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });

    it('returns Left when cancellationWindowDays is not an integer (1.5)', () => {
      const result = RiskThreshold.create({
        paymentFailureLimit: 3,
        cancellationRateLimit: 0.3,
        paymentWindowDays: 30,
        cancellationWindowDays: 1.5,
      });

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(RiskErrorCodes.RISK_INDICATOR_INVALID);
      }
    });
  });
});
