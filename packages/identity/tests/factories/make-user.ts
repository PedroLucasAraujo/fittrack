import { generateId, UTCDateTime } from '@fittrack/core';
import { User } from '../../domain/aggregates/user.js';
import { Email } from '../../domain/value-objects/email.js';
import { PersonName } from '../../domain/value-objects/person-name.js';
import { UserRole } from '../../domain/enums/user-role.js';

type UserOverrides = Partial<{
  id: string;
  name: PersonName;
  email: Email;
  role: UserRole;
}>;

/**
 * Test factory for creating valid User aggregates with sensible defaults.
 * Supports partial overrides for any field.
 */
export function makeUser(overrides: UserOverrides = {}): User {
  const nameResult = PersonName.create('John Doe');
  const emailResult = Email.create(`user-${generateId().slice(0, 8)}@example.com`);

  const result = User.create({
    id: overrides.id ?? generateId(),
    name: overrides.name ?? (nameResult.value as PersonName),
    email: overrides.email ?? (emailResult.value as Email),
    role: overrides.role ?? UserRole.CLIENT,
  });

  // Factory always produces valid users — safe to assert
  if (result.isLeft()) {
    throw new Error(`makeUser failed: ${result.value.message}`);
  }

  return result.value;
}

/**
 * Creates a reconstituted User (as if loaded from persistence).
 * No events emitted.
 */
export function makeReconstitutedUser(overrides: UserOverrides & { version?: number } = {}): User {
  const nameResult = PersonName.create('John Doe');
  const emailResult = Email.create('john@example.com');

  return User.reconstitute(
    overrides.id ?? generateId(),
    {
      name: overrides.name ?? (nameResult.value as PersonName),
      email: overrides.email ?? (emailResult.value as Email),
      role: overrides.role ?? UserRole.CLIENT,
      createdAtUtc: UTCDateTime.now(),
    },
    overrides.version ?? 0,
  );
}
