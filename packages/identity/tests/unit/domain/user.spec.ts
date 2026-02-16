import { describe, it, expect } from 'vitest';
import { generateId } from '@fittrack/core';
import { User } from '../../../domain/aggregates/user.js';
import { Email } from '../../../domain/value-objects/email.js';
import { PersonName } from '../../../domain/value-objects/person-name.js';
import { UserRole } from '../../../domain/enums/user-role.js';
import { makeUser, makeReconstitutedUser } from '../../factories/make-user.js';

describe('User', () => {
  describe('create()', () => {
    it('creates a valid User with all required fields', () => {
      const name = PersonName.create('John Doe').value as PersonName;
      const email = Email.create('john@example.com').value as Email;

      const result = User.create({ name, email, role: UserRole.CLIENT });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const user = result.value;
        expect(user.name.value).toBe('John Doe');
        expect(user.email.value).toBe('john@example.com');
        expect(user.role).toBe(UserRole.CLIENT);
        expect(user.createdAtUtc).toBeDefined();
        expect(user.id).toBeDefined();
      }
    });

    it('uses the provided id when given', () => {
      const id = generateId();
      const name = PersonName.create('Jane Doe').value as PersonName;
      const email = Email.create('jane@example.com').value as Email;

      const result = User.create({ id, name, email, role: UserRole.PROFESSIONAL });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.id).toBe(id);
      }
    });

    it('does not emit domain events (events are UseCase responsibility)', () => {
      const user = makeUser();
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('rejects an invalid id (non-UUIDv4)', () => {
      const name = PersonName.create('John Doe').value as PersonName;
      const email = Email.create('john@example.com').value as Email;

      expect(() => {
        User.create({ id: 'not-a-uuid', name, email, role: UserRole.CLIENT });
      }).toThrow();
    });
  });

  describe('reconstitute()', () => {
    it('does not emit domain events', () => {
      const user = makeReconstitutedUser();
      expect(user.getDomainEvents()).toHaveLength(0);
    });

    it('preserves the provided version', () => {
      const user = makeReconstitutedUser({ version: 5 });
      expect(user.version).toBe(5);
    });
  });

  describe('getters', () => {
    it('exposes name, email, role, and createdAtUtc', () => {
      const user = makeUser({ role: UserRole.ADMIN });

      expect(user.name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.createdAtUtc).toBeDefined();
    });
  });

  describe('equals()', () => {
    it('considers two users with the same id equal', () => {
      const id = generateId();
      const a = makeReconstitutedUser({ id });
      const b = makeReconstitutedUser({ id });
      expect(a.equals(b)).toBe(true);
    });

    it('considers two users with different ids not equal', () => {
      const a = makeReconstitutedUser();
      const b = makeReconstitutedUser();
      expect(a.equals(b)).toBe(false);
    });
  });
});
