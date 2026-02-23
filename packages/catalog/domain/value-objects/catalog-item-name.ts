import { ValueObject, left, right } from '@fittrack/core';
import type { DomainResult } from '@fittrack/core';
import { InvalidCatalogItemError } from '../errors/invalid-catalog-item-error.js';

interface CatalogItemNameProps {
  value: string;
}

/**
 * CatalogItem name value object.
 *
 * Rules:
 * - 1 to 120 characters after trimming leading/trailing whitespace.
 * - Must be non-empty.
 *
 * Used as the human-readable identifier for exercises and future catalog
 * resource types. The value is also embedded verbatim in ExerciseAssignment
 * snapshots at prescription time (ADR-0011 §2).
 */
export class CatalogItemName extends ValueObject<CatalogItemNameProps> {
  static readonly MAX_LENGTH = 120;
  static readonly MIN_LENGTH = 1;

  private constructor(props: CatalogItemNameProps) {
    super(props);
  }

  static create(raw: string): DomainResult<CatalogItemName> {
    const trimmed = raw.trim();

    if (trimmed.length < CatalogItemName.MIN_LENGTH) {
      return left(new InvalidCatalogItemError('CatalogItem name must not be empty'));
    }

    if (trimmed.length > CatalogItemName.MAX_LENGTH) {
      return left(
        new InvalidCatalogItemError(
          `CatalogItem name must not exceed ${CatalogItemName.MAX_LENGTH} characters`,
        ),
      );
    }

    return right(new CatalogItemName({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
