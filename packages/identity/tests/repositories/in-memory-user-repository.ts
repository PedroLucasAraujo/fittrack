import type { UniqueEntityId } from '@fittrack/core';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import type { User } from '../../domain/aggregates/user.js';
import type { Email } from '../../domain/value-objects/email.js';

/**
 * In-memory implementation of IUserRepository for unit testing.
 *
 * Stores users in an array and supports upsert semantics on `save()`.
 */
export class InMemoryUserRepository implements IUserRepository {
  items: User[] = [];

  async findById(id: UniqueEntityId): Promise<User | null> {
    return this.items.find((u) => u.id === id.value) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    return (
      this.items.find((u) => u.email.equals(email)) ?? null
    );
  }

  async save(entity: User): Promise<void> {
    const index = this.items.findIndex((u) => u.id === entity.id);
    if (index >= 0) {
      this.items[index] = entity;
    } else {
      this.items.push(entity);
    }
  }
}
