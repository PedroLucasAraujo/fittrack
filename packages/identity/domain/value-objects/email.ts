import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidEmailError } from '../errors/invalid-email-error.js';

interface EmailProps {
  value: string;
}

/**
 * RFC-5321-inspired email value object.
 *
 * Normalizes to lowercase and trims whitespace so that equality checks are
 * case-insensitive (per SMTP local-part conventions on most providers).
 *
 * Email is classified as Category C (Identification/PII) under ADR-0037.
 * It must never appear in logs, error messages to clients, or AuditLog entries.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(value: string): DomainResult<Email> {
    const trimmed = value.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmed)) {
      return left(new InvalidEmailError(value));
    }

    return right(new Email({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
