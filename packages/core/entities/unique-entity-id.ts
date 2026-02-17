import { ValueObject } from '../value-objects/value-object';
import { DomainInvariantError } from '../errors/domain-invariant-error';
import { ErrorCodes } from '../errors/error-codes';
import type { DomainResult } from '../either/domain-result';
import { right, left } from '../either/either';
import { generateId } from '../utils/generate-id';

interface UniqueEntityIdProps {
  value: string;
}

/** UUIDv4 regex — version nibble = 4, variant nibble = 8/9/a/b. */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * A typed wrapper around a UUIDv4 string used as the identity of domain
 * entities and aggregate roots.
 *
 * Listed as a canonical shared domain primitive in ADR-0002 §4.
 * Required by ADR-0047 §6: "All aggregate roots use UUIDv4 as their primary
 * identifier."
 *
 * ## Usage
 *
 * ```typescript
 * // Creating a new ID (aggregate construction)
 * const id = UniqueEntityId.generate();
 *
 * // Reconstituting an ID from persistence
 * const result = UniqueEntityId.create(persistedUuidString);
 * if (result.isLeft()) { ... } // invalid UUID in DB — should not happen
 * ```
 *
 * Repository interfaces accept `UniqueEntityId` as the parameter type for
 * `findById` to prevent passing arbitrary strings. See ADR-0004 §2.
 */
export class UniqueEntityId extends ValueObject<UniqueEntityIdProps> {
  private constructor(props: UniqueEntityIdProps) {
    super(props);
  }

  /**
   * Generates a brand-new `UniqueEntityId` using a cryptographically random
   * UUIDv4. This factory always succeeds and is the standard way to create
   * IDs for new aggregates.
   */
  static generate(): UniqueEntityId {
    return new UniqueEntityId({ value: generateId() });
  }

  /**
   * Wraps an existing UUID string in a `UniqueEntityId`.
   *
   * Use this when reconstituting an aggregate from persistence where the UUID
   * was already validated at creation time. Returns `Left<DomainInvariantError>`
   * for any string that is not a valid UUIDv4.
   */
  static create(value: string): DomainResult<UniqueEntityId> {
    if (!UUID_V4_REGEX.test(value)) {
      return left(
        new DomainInvariantError(
          `UniqueEntityId must be a valid UUIDv4. Received: "${value}".`,
          ErrorCodes.INVALID_UUID,
          { value },
        ),
      );
    }
    return right(new UniqueEntityId({ value }));
  }

  /** The underlying UUID string. */
  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
