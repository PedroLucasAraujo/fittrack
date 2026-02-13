import { describe, it, expect } from 'vitest';
import { BaseEntity } from '../../entities/base-entity.js';
import { DomainInvariantError } from '../../errors/domain-invariant-error.js';

// Minimal concrete subclass for testing the abstract BaseEntity
class TestEntity extends BaseEntity<{ name: string }> {
  static create(id: string, name: string): TestEntity {
    return new TestEntity(id, { name });
  }
  get name(): string {
    return this.props.name;
  }
}

const VALID_UUID = '12345678-1234-4234-a234-123456789012';
const OTHER_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('BaseEntity', () => {
  describe('constructor — UUID validation', () => {
    it('accepts a valid UUIDv4', () => {
      const entity = TestEntity.create(VALID_UUID, 'Alice');
      expect(entity.id).toBe(VALID_UUID);
    });

    it('throws DomainInvariantError for an empty string', () => {
      expect(() => TestEntity.create('', 'Alice')).toThrow(DomainInvariantError);
    });

    it('throws for a non-UUID string', () => {
      expect(() => TestEntity.create('not-a-uuid', 'Alice')).toThrow(DomainInvariantError);
    });

    it('throws for a UUID with wrong version (v1)', () => {
      // version nibble is not 4
      expect(() => TestEntity.create('12345678-1234-1234-a234-123456789012', 'Alice')).toThrow(DomainInvariantError);
    });

    it('throws for a UUID with wrong variant bits', () => {
      // variant nibble must be 8-b; 0 is invalid
      expect(() => TestEntity.create('12345678-1234-4234-0234-123456789012', 'Alice')).toThrow(DomainInvariantError);
    });
  });

  describe('id getter', () => {
    it('returns the id passed to the constructor', () => {
      const entity = TestEntity.create(VALID_UUID, 'Alice');
      expect(entity.id).toBe(VALID_UUID);
    });
  });

  describe('equals()', () => {
    it('returns true for two entities with the same id', () => {
      const a = TestEntity.create(VALID_UUID, 'Alice');
      const b = TestEntity.create(VALID_UUID, 'Bob'); // different props, same id
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for two entities with different ids', () => {
      const a = TestEntity.create(VALID_UUID, 'Alice');
      const b = TestEntity.create(OTHER_UUID, 'Alice');
      expect(a.equals(b)).toBe(false);
    });
  });
});
