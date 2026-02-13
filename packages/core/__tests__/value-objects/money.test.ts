import { describe, it, expect } from 'vitest';
import { Money } from '../../value-objects/money.js';

describe('Money.create()', () => {
  describe('happy path', () => {
    it('returns Right for a valid integer amount with BRL currency', () => {
      const result = Money.create(9990, 'BRL');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.amount).toBe(9990);
        expect(result.value.currency).toBe('BRL');
      }
    });

    it('accepts zero amount', () => {
      expect(Money.create(0, 'USD').isRight()).toBe(true);
    });

    it('accepts other ISO 4217 codes', () => {
      expect(Money.create(100, 'USD').isRight()).toBe(true);
      expect(Money.create(100, 'EUR').isRight()).toBe(true);
    });
  });

  describe('amount validation', () => {
    it('returns Left for a float amount', () => {
      const result = Money.create(99.9, 'BRL');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for a negative amount', () => {
      const result = Money.create(-1, 'BRL');
      expect(result.isLeft()).toBe(true);
    });

    it('float error code is INVALID_MONEY_VALUE', () => {
      const result = Money.create(1.5, 'BRL');
      if (result.isLeft()) expect(result.value.code).toBe('INVALID_MONEY_VALUE');
    });

    it('negative error code is INVALID_MONEY_VALUE', () => {
      const result = Money.create(-100, 'BRL');
      if (result.isLeft()) expect(result.value.code).toBe('INVALID_MONEY_VALUE');
    });
  });

  describe('currency validation', () => {
    it('returns Left for a lowercase currency code', () => {
      expect(Money.create(100, 'brl').isLeft()).toBe(true);
    });

    it('returns Left for a 2-letter code', () => {
      expect(Money.create(100, 'BR').isLeft()).toBe(true);
    });

    it('returns Left for a 4-letter code', () => {
      expect(Money.create(100, 'BRLS').isLeft()).toBe(true);
    });

    it('returns Left for an empty string', () => {
      expect(Money.create(100, '').isLeft()).toBe(true);
    });

    it('currency error code is INVALID_CURRENCY', () => {
      const result = Money.create(100, 'xx');
      if (result.isLeft()) expect(result.value.code).toBe('INVALID_CURRENCY');
    });
  });
});

describe('Money getters', () => {
  it('amount returns the integer amount', () => {
    const result = Money.create(4999, 'BRL');
    if (result.isRight()) expect(result.value.amount).toBe(4999);
  });

  it('currency returns the ISO code', () => {
    const result = Money.create(4999, 'BRL');
    if (result.isRight()) expect(result.value.currency).toBe('BRL');
  });
});

describe('Money.toDecimal()', () => {
  it('converts centavos to decimal value', () => {
    const result = Money.create(9990, 'BRL');
    if (result.isRight()) expect(result.value.toDecimal()).toBe(99.9);
  });

  it('converts zero', () => {
    const result = Money.create(0, 'USD');
    if (result.isRight()) expect(result.value.toDecimal()).toBe(0);
  });
});

describe('Money.toString()', () => {
  it('returns decimal with 2 decimal places and currency code', () => {
    const result = Money.create(9990, 'BRL');
    if (result.isRight()) expect(result.value.toString()).toBe('99.90 BRL');
  });
});
