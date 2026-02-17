import { describe, it, expect } from 'vitest';
import { Money } from '@fittrack/core';
import { PlatformFee } from '../../../domain/value-objects/platform-fee.js';
import { BillingErrorCodes } from '../../../domain/errors/billing-error-codes.js';

describe('PlatformFee', () => {
  describe('create()', () => {
    it('creates with correct split for 10% fee', () => {
      const money = Money.create(10000, 'BRL').value as Money;
      const result = PlatformFee.create(money, 1000);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.totalAmount.amount).toBe(10000);
        expect(result.value.feePercentage).toBe(1000);
        expect(result.value.platformAmount.amount).toBe(1000);
        expect(result.value.professionalAmount.amount).toBe(9000);
      }
    });

    it('creates with correct split for 5% fee', () => {
      const money = Money.create(20000, 'BRL').value as Money;
      const result = PlatformFee.create(money, 500);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.platformAmount.amount).toBe(1000);
        expect(result.value.professionalAmount.amount).toBe(19000);
      }
    });

    it('floors platform amount (no rounding up)', () => {
      const money = Money.create(1001, 'BRL').value as Money;
      const result = PlatformFee.create(money, 1000);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        // 1001 * 1000 / 10000 = 100.1 → floor → 100
        expect(result.value.platformAmount.amount).toBe(100);
        expect(result.value.professionalAmount.amount).toBe(901);
      }
    });

    it('creates with 0% fee (all goes to professional)', () => {
      const money = Money.create(5000, 'BRL').value as Money;
      const result = PlatformFee.create(money, 0);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.platformAmount.amount).toBe(0);
        expect(result.value.professionalAmount.amount).toBe(5000);
      }
    });

    it('creates with 100% fee (all goes to platform)', () => {
      const money = Money.create(5000, 'BRL').value as Money;
      const result = PlatformFee.create(money, 10000);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.platformAmount.amount).toBe(5000);
        expect(result.value.professionalAmount.amount).toBe(0);
      }
    });

    it('preserves currency from total amount', () => {
      const money = Money.create(10000, 'USD').value as Money;
      const result = PlatformFee.create(money, 1000);

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.platformAmount.currency).toBe('USD');
        expect(result.value.professionalAmount.currency).toBe('USD');
      }
    });

    it('rejects negative fee percentage', () => {
      const money = Money.create(10000, 'BRL').value as Money;
      const result = PlatformFee.create(money, -1);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_PLATFORM_FEE);
      }
    });

    it('rejects fee percentage above 10000 (100%)', () => {
      const money = Money.create(10000, 'BRL').value as Money;
      const result = PlatformFee.create(money, 10001);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_PLATFORM_FEE);
      }
    });

    it('rejects non-integer fee percentage', () => {
      const money = Money.create(10000, 'BRL').value as Money;
      const result = PlatformFee.create(money, 10.5);

      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(BillingErrorCodes.INVALID_PLATFORM_FEE);
      }
    });
  });
});
