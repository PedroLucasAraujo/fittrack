import { describe, it, expect } from 'vitest';
import { PersonName } from '../../../domain/value-objects/person-name.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('PersonName', () => {
  describe('create()', () => {
    it('returns Right for a valid name', () => {
      const result = PersonName.create('John Doe');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('John Doe');
      }
    });

    it('trims whitespace', () => {
      const result = PersonName.create('  John Doe  ');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('John Doe');
      }
    });

    it('accepts minimum length (2 chars)', () => {
      const result = PersonName.create('Jo');
      expect(result.isRight()).toBe(true);
    });

    it('accepts maximum length (120 chars)', () => {
      const name = 'A'.repeat(120);
      const result = PersonName.create(name);
      expect(result.isRight()).toBe(true);
    });

    it('returns Left for empty string', () => {
      const result = PersonName.create('');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PERSON_NAME);
      }
    });

    it('returns Left for whitespace-only string', () => {
      const result = PersonName.create('   ');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for name shorter than 2 chars after trim', () => {
      const result = PersonName.create('J');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for name longer than 120 chars', () => {
      const name = 'A'.repeat(121);
      const result = PersonName.create(name);
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('considers two names with the same value equal', () => {
      const a = PersonName.create('John Doe');
      const b = PersonName.create('John Doe');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('considers different names not equal', () => {
      const a = PersonName.create('John Doe');
      const b = PersonName.create('Jane Doe');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });
});
