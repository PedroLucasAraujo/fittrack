import { describe, it, expect, beforeEach } from 'vitest';
import { CreateUser } from '../../../application/use-cases/create-user.js';
import { InMemoryUserRepository } from '../../repositories/in-memory-user-repository.js';
import { makeUser } from '../../factories/make-user.js';
import { Email } from '../../../domain/value-objects/email.js';
import { UserRole } from '../../../domain/enums/user-role.js';
import { IdentityErrorCodes } from '../../../domain/errors/identity-error-codes.js';

describe('CreateUser', () => {
  let userRepository: InMemoryUserRepository;
  let sut: CreateUser;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    sut = new CreateUser(userRepository);
  });

  it('creates a user successfully and returns output DTO', async () => {
    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.CLIENT,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const output = result.value;
      expect(output.id).toBeDefined();
      expect(output.name).toBe('John Doe');
      expect(output.email).toBe('john@example.com');
      expect(output.role).toBe(UserRole.CLIENT);
      expect(output.createdAtUtc).toBeDefined();
    }
  });

  it('persists the user in the repository', async () => {
    await sut.execute({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: UserRole.PROFESSIONAL,
    });

    expect(userRepository.items).toHaveLength(1);
  });

  it('returns error for invalid email', async () => {
    const result = await sut.execute({
      name: 'John Doe',
      email: 'not-an-email',
      role: UserRole.CLIENT,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.INVALID_EMAIL);
    }
    expect(userRepository.items).toHaveLength(0);
  });

  it('returns error for invalid name', async () => {
    const result = await sut.execute({
      name: '',
      email: 'john@example.com',
      role: UserRole.CLIENT,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.INVALID_PERSON_NAME);
    }
  });

  it('returns error for invalid role', async () => {
    const result = await sut.execute({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'SUPERADMIN',
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.INVALID_ROLE);
    }
  });

  it('returns error for duplicate email', async () => {
    const email = Email.create('duplicate@example.com').value as Email;
    const existing = makeUser({ email });
    userRepository.items.push(existing);

    const result = await sut.execute({
      name: 'Another User',
      email: 'duplicate@example.com',
      role: UserRole.CLIENT,
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe(IdentityErrorCodes.EMAIL_ALREADY_IN_USE);
    }
    expect(userRepository.items).toHaveLength(1);
  });
});
