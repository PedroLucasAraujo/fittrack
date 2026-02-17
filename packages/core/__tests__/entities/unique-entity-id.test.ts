import { describe, it, expect } from 'vitest';
import { UniqueEntityId } from '../../entities/unique-entity-id.js';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_UUID = '12345678-1234-4234-a234-123456789012';

describe('UniqueEntityId', () => {
  describe('generate()', () => {
    it('returns a valid UUIDv4', () => {
      const id = UniqueEntityId.generate();
      expect(UUID_V4_REGEX.test(id.value)).toBe(true);
    });

    it('produces a different UUID each call', () => {
      const a = UniqueEntityId.generate();
      const b = UniqueEntityId.generate();
      expect(a.value).not.toBe(b.value);
    });
  });

  describe('create()', () => {
    it('returns Right for a valid UUIDv4 string', () => {
      const result = UniqueEntityId.create(VALID_UUID);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.value).toBe(VALID_UUID);
    });

    it('returns Left for an empty string', () => {
      const result = UniqueEntityId.create('');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for a non-UUID string', () => {
      const result = UniqueEntityId.create('not-a-uuid');
      expect(result.isLeft()).toBe(true);
    });

    it('returns Left for a UUID with wrong version', () => {
      const result = UniqueEntityId.create('12345678-1234-3234-a234-123456789012');
      expect(result.isLeft()).toBe(true);
    });

    it('error code is INVALID_UUID', () => {
      const result = UniqueEntityId.create('bad');
      if (result.isLeft()) {
        expect(result.value.code).toBe('INVALID_UUID');
      }
    });
  });

  describe('value getter and toString()', () => {
    it('value returns the UUID string', () => {
      const id = UniqueEntityId.create(VALID_UUID);
      if (id.isRight()) expect(id.value.value).toBe(VALID_UUID);
    });

    it('toString() returns the UUID string', () => {
      const id = UniqueEntityId.create(VALID_UUID);
      if (id.isRight()) expect(id.value.toString()).toBe(VALID_UUID);
    });
  });

  describe('equals()', () => {
    it('two ids with the same value are equal', () => {
      const a = UniqueEntityId.create(VALID_UUID);
      const b = UniqueEntityId.create(VALID_UUID);
      if (a.isRight() && b.isRight()) {
        expect(a.value.equals(b.value)).toBe(true);
      }
    });

    it('two ids with different values are not equal', () => {
      const a = UniqueEntityId.create(VALID_UUID);
      const b = UniqueEntityId.generate();
      if (a.isRight()) {
        expect(a.value.equals(b)).toBe(false);
      }
    });
  });
});
