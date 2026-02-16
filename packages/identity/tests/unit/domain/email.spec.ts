import { describe, it, expect } from 'vitest';
import { Email } from '../../../domain/value-objects/email.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('Email', () => {
  describe('create()', () => {
    it('returns Right for a valid email', () => {
      const result = Email.create('user@example.com');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('user@example.com');
      }
    });

    it('normalizes to lowercase', () => {
      const result = Email.create('User@Example.COM');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('user@example.com');
      }
    });

    it('trims whitespace', () => {
      const result = Email.create('  user@example.com  ');
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('user@example.com');
      }
    });

    it('returns Left for an empty string', () => {
      const result = Email.create('');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.code).toBe(IdentityErrorCodes.INVALID_EMAIL);
      }
    });

    it('returns Left for missing @ symbol', () => {
      const result = Email.create('userexample.com');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for missing domain', () => {
      const result = Email.create('user@');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for missing local part', () => {
      const result = Email.create('@example.com');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for missing TLD', () => {
      const result = Email.create('user@example');
      expect(result.isLeft()).toBe(true);
    });
  });

  describe('equals()', () => {
    it('considers two emails with the same value equal', () => {
      const a = Email.create('same@example.com');
      const b = Email.create('same@example.com');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('considers case-normalized versions equal', () => {
      const a = Email.create('Test@Example.com');
      const b = Email.create('test@example.com');
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });
  });
});
