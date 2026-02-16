import { left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { Email } from '../../domain/value-objects/email.js';
import { PersonName } from '../../domain/value-objects/person-name.js';
import { UserRole } from '../../domain/enums/user-role.js';
import { User } from '../../domain/aggregates/user.js';
import type { IUserRepository } from '../../domain/repositories/user-repository.js';
import { InvalidRoleError } from '../../domain/errors/invalid-role-error.js';
import { EmailAlreadyInUseError } from '../../domain/errors/email-already-in-use-error.js';
import type { CreateUserInputDTO } from '../dtos/create-user-input-dto.js';
import type { CreateUserOutputDTO } from '../dtos/create-user-output-dto.js';

/**
 * Creates a new User on the platform.
 *
 * Validates email uniqueness before persisting. Role is immutable after
 * creation (ADR-0023 §4). Returns an Output DTO — never exposes the aggregate.
 */
export class CreateUser {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(dto: CreateUserInputDTO): Promise<DomainResult<CreateUserOutputDTO>> {
    const emailResult = Email.create(dto.email);
    if (emailResult.isLeft()) return left(emailResult.value);

    const nameResult = PersonName.create(dto.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    const role = dto.role as UserRole;
    if (!Object.values(UserRole).includes(role)) {
      return left(new InvalidRoleError(dto.role));
    }

    const existing = await this.userRepository.findByEmail(emailResult.value);
    if (existing) {
      return left(new EmailAlreadyInUseError(dto.email));
    }

    const userResult = User.create({
      name: nameResult.value,
      email: emailResult.value,
      role,
    });
    /* v8 ignore next */
    if (userResult.isLeft()) return left(userResult.value);

    const user = userResult.value;
    await this.userRepository.save(user);

    return right({
      id: user.id,
      name: user.name.value,
      email: user.email.value,
      role: user.role,
      createdAtUtc: user.createdAtUtc.toISO(),
    });
  }
}
