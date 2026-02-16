import { AggregateRoot, UTCDateTime, generateId, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Email } from '../value-objects/email.js';
import { PersonName } from '../value-objects/person-name.js';
import { UserRole } from '../enums/user-role.js';

export interface UserProps {
  name: PersonName;
  email: Email;
  role: UserRole;
  createdAtUtc: UTCDateTime;
}

/**
 * User aggregate root — the identity anchor for every platform actor.
 *
 * A User represents an authenticated identity on the platform. Each user has
 * exactly one immutable role assigned at creation (ADR-0023 §4): CLIENT,
 * PROFESSIONAL, or ADMIN.
 *
 * User does not hold a direct reference to ProfessionalProfile; the
 * relationship is resolved by `ProfessionalProfile.userId` (ADR-0047 §5:
 * cross-aggregate references by ID only).
 *
 * ## LGPD classification (ADR-0037)
 *
 * Name and email are Category C (Identification/PII). They are subject to
 * anonymization on LGPD erasure requests but the structural User record is
 * retained to preserve referential integrity with Execution, Transaction,
 * and AuditLog entities.
 */
export class User extends AggregateRoot<UserProps> {
  private constructor(id: string, props: UserProps, version: number = 0) {
    super(id, props, version);
  }

  /**
   * Creates a new User.
   *
   * Role is immutable after creation (ADR-0023 §4).
   * Domain events (if any) are dispatched by the Application layer, not
   * by the aggregate (ADR-0009 Official Domain Events Policy).
   */
  static create(props: {
    id?: string;
    name: PersonName;
    email: Email;
    role: UserRole;
  }): DomainResult<User> {
    const id = props.id ?? generateId();
    const createdAtUtc = UTCDateTime.now();

    const user = new User(id, {
      name: props.name,
      email: props.email,
      role: props.role,
      createdAtUtc,
    });

    return right(user);
  }

  /**
   * Reconstitutes a User from persistence. No events emitted, no validation
   * — the data is trusted since it was validated at creation time.
   */
  static reconstitute(id: string, props: UserProps, version: number): User {
    return new User(id, props, version);
  }

  get name(): PersonName {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get createdAtUtc(): UTCDateTime {
    return this.props.createdAtUtc;
  }
}
