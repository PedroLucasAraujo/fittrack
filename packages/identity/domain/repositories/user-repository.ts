import type { IRepository } from '@fittrack/core';
import type { User } from '../aggregates/user.js';
import type { Email } from '../value-objects/email.js';

/**
 * Repository interface for the User aggregate root (ADR-0004).
 *
 * Implementations live in the infrastructure layer and use Prisma.
 * The domain layer only depends on this interface.
 */
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: Email): Promise<User | null>;
}
